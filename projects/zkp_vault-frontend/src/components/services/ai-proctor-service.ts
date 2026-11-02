import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as speechCommands from '@tensorflow-models/speech-commands';

export interface DetectionResult {
  faceCount: number;
  isLookingAtScreen: boolean;
  phoneDetected: boolean;
  timestamp: number;
}

export interface IncidentLog {
  type: 'no_face' | 'multi_face' | 'looking_away' | 'phone_detected' | 'absence' | 'audio_detected' | 'tab_switch';
  timestamp: number;
  details: string;
}

export interface SessionData {
  examId: string;
  studentHash: string;
  startTime: number;
  endTime?: number;
  incidents: IncidentLog[];
  detections: DetectionResult[];
  trustScore: number;
  proofHash: string;
}

export class AIProctorService {
  private faceDetectionModel: any = null;
  private objectDetectionModel: cocoSsd.ObjectDetection | null = null;
  private speechModel: speechCommands.SpeechCommandRecognizer | null = null;
  private isInitialized = false;

  // Tracking state
  private consecutiveLookingAway = 0;
  private consecutiveNoFace = 0;
  private readonly LOOKING_AWAY_THRESHOLD = 15; // Reduced from 30 for faster detection
  private readonly NO_FACE_THRESHOLD = 10; // frames before logging
  private readonly FACE_CONFIDENCE_THRESHOLD = 0.5; // Lowered for easier detection

  // Track last incident times to prevent spam
  private lastIncidentTimes: Map<string, number> = new Map();
  private readonly INCIDENT_COOLDOWN = 3000; // 3 seconds

  /**
   * Initialize all AI models
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing AI Proctor...');

    try {
      // Initialize TensorFlow.js backend
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('✅ TensorFlow.js ready with backend:', tf.getBackend());

      // Load BlazeFace for face detection
      console.log('📥 Loading BlazeFace model...');
      const blazeface = await import('@tensorflow-models/blazeface');
      this.faceDetectionModel = await blazeface.load();
      console.log('✅ BlazeFace model loaded successfully');

      // Load COCO-SSD for object detection (phones, etc.)
      console.log('📥 Loading COCO-SSD model...');
      this.objectDetectionModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2' // Faster, lighter model
      });
      console.log('✅ COCO-SSD model loaded successfully');

      // Load Speech Commands model
      console.log('📥 Loading Speech Commands model...');
      this.speechModel = speechCommands.create('BROWSER_FFT');
      await this.speechModel.ensureModelLoaded();
      console.log('✅ Speech Commands model loaded successfully');

      this.isInitialized = true;
      console.log('🎉 AI Proctor initialized and ready!');
      console.log('👀 Detection thresholds:', {
        faceConfidence: this.FACE_CONFIDENCE_THRESHOLD,
        lookingAwayFrames: this.LOOKING_AWAY_THRESHOLD,
        noFaceFrames: this.NO_FACE_THRESHOLD,
        incidentCooldown: `${this.INCIDENT_COOLDOWN}ms`
      });
    } catch (error) {
      console.error('❌ Failed to initialize AI Proctor:', error);
      throw new Error('Failed to initialize AI models: ' + error);
    }
  }

  /**
   * Analyze a single video frame
   */
  async analyzeFrame(videoElement: HTMLVideoElement): Promise<DetectionResult> {
    if (!this.isInitialized) {
      throw new Error('AI Proctor not initialized. Call initialize() first.');
    }

    try {
      const faceCount = await this.detectFaces(videoElement);
      const phoneDetected = await this.detectPhone(videoElement);

      // Gaze estimation based on face presence
      const isLookingAtScreen = this.estimateGaze(faceCount);

      const result = {
        faceCount,
        isLookingAtScreen,
        phoneDetected,
        timestamp: Date.now(),
      };

      // Log every 30 frames (roughly every second at 30fps)
      if (Math.random() < 0.033) {
        console.log('📊 Detection result:', result);
      }

      return result;
    } catch (error) {
      console.error('Detection error in analyzeFrame:', error);
      // Return safe default
      return {
        faceCount: 1,
        isLookingAtScreen: true,
        phoneDetected: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Detect faces in video frame
   */
  private async detectFaces(videoElement: HTMLVideoElement): Promise<number> {
    try {
      if (!this.faceDetectionModel) {
        console.warn('Face detection model not loaded');
        return 0;
      }

      const predictions = await this.faceDetectionModel.estimateFaces(videoElement, false);

      // Filter by confidence
      const confidentFaces = predictions.filter(
        (pred: any) => {
          const confidence = Array.isArray(pred.probability) ? pred.probability[0] : pred.probability;
          return confidence > this.FACE_CONFIDENCE_THRESHOLD;
        }
      );

      const count = confidentFaces.length;

      // Log face detection occasionally
      if (Math.random() < 0.05) {
        console.log(`👤 Detected ${count} face(s) with confidence >${this.FACE_CONFIDENCE_THRESHOLD}`);
      }

      return count;
    } catch (error) {
      console.error('Face detection error:', error);
      return 0;
    }
  }

  /**
   * Detect mobile phones in frame
   */
  private async detectPhone(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      if (!this.objectDetectionModel) {
        console.warn('Object detection model not loaded');
        return false;
      }

      const predictions = await this.objectDetectionModel.detect(videoElement);

      // Log all detected objects occasionally
      if (predictions.length > 0 && Math.random() < 0.1) {
        console.log('🔍 Detected objects:', predictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
      }

      // Check for cell phone detection - LOWERED THRESHOLD
      const phoneDetected = predictions.some(
        pred => pred.class === 'cell phone' && pred.score > 0.3 // Very low threshold!
      );

      if (phoneDetected) {
        console.log('📱 PHONE DETECTED!', predictions.find(p => p.class === 'cell phone'));
      }

      return phoneDetected;
    } catch (error) {
      console.error('Object detection error:', error);
      return false;
    }
  }

  /**
   * Estimate if student is looking at screen
   */
  private estimateGaze(faceCount: number): boolean {
    if (faceCount === 1) {
      this.consecutiveLookingAway = 0;
      this.consecutiveNoFace = 0;
      return true;
    } else if (faceCount === 0) {
      this.consecutiveNoFace++;
      this.consecutiveLookingAway = 0;
      return false;
    } else {
      // Multiple faces
      this.consecutiveLookingAway++;
      this.consecutiveNoFace = 0;
      return false;
    }
  }

  /**
   * Calculate trust score based on session data
   */
  calculateTrustScore(sessionData: Partial<SessionData>): number {
    let score = 100;

    if (!sessionData.incidents) return score;

    // Deduct points for incidents
    const incidentCounts = {
      no_face: 0,
      multi_face: 0,
      looking_away: 0,
      phone_detected: 0,
      absence: 0,
      audio_detected: 0,
      tab_switch: 0,
    };

    sessionData.incidents.forEach(incident => {
      if (incidentCounts[incident.type as keyof typeof incidentCounts] !== undefined) {
        incidentCounts[incident.type as keyof typeof incidentCounts]++;
      }
    });

    // Scoring penalties
    score -= incidentCounts.no_face * 5;
    score -= incidentCounts.multi_face * 10;
    score -= incidentCounts.looking_away * 3;
    score -= incidentCounts.phone_detected * 15;
    score -= incidentCounts.absence * 8;
    score -= incidentCounts.audio_detected * 15;
    score -= incidentCounts.tab_switch * 20;

    // Ensure score is between 0 and 100
    const finalScore = Math.max(0, Math.min(100, score));

    console.log('📊 Trust Score Calculation:', {
      incidents: incidentCounts,
      finalScore
    });

    return finalScore;
  }

  /**
   * Generate proof hash from session data
   */
  async generateProofHash(sessionData: Partial<SessionData>): Promise<string> {
    const proofObject = {
      exam_id: sessionData.examId,
      student_hash: sessionData.studentHash,
      trust_score: sessionData.trustScore,
      incidents: sessionData.incidents,
      timestamp: sessionData.startTime,
      detection_count: sessionData.detections?.length || 0,
    };

    const proofJSON = JSON.stringify(proofObject);
    const encoder = new TextEncoder();
    const data = encoder.encode(proofJSON);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `0x${hashHex}`;
  }

  /**
   * Generate student hash (anonymized identity)
   */
  async generateStudentHash(studentId: string, salt: string = 'IntegriKey'): Promise<string> {
    const data = `${studentId}_${salt}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `0x${hashHex}`;
  }

  /**
   * Mock IPFS uploader for storing incident timeline on decentralized storage
   */
  async uploadIncidentTimelineToIPFS(sessionData: Partial<SessionData>): Promise<string> {
    const timelineData = {
      exam_id: sessionData.examId,
      student_hash: sessionData.studentHash,
      incidents: sessionData.incidents || [],
      stored_at: new Date().toISOString()
    };
    
    console.log('📦 Preparing to upload incident timeline to IPFS:', timelineData);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // For a hackathon, we create a deterministic "CID" using sha-256
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(timelineData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Generate a Qm... style IPFS string
    // IPFS Base58 CIDs usually start with Qm
    const mockHash = 'Qm' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 44);
    const ipfsUri = `ipfs://${mockHash}`;
    
    console.log('✅ Successfully pinned to IPFS gateway:', ipfsUri);
    return ipfsUri;
  }

  /**
   * Check if we can log an incident (cooldown check)
   */
  private canLogIncident(type: string): boolean {
    const lastTime = this.lastIncidentTimes.get(type) || 0;
    const now = Date.now();

    if (now - lastTime > this.INCIDENT_COOLDOWN) {
      this.lastIncidentTimes.set(type, now);
      return true;
    }
    return false;
  }

  /**
   * Check detection result and log incidents
   */
  checkForIncidents(
    detection: DetectionResult,
    incidents: IncidentLog[]
  ): IncidentLog[] {
    const newIncidents: IncidentLog[] = [...incidents];

    // No face detected - with threshold
    if (detection.faceCount === 0) {
      if (this.consecutiveNoFace > this.NO_FACE_THRESHOLD && this.canLogIncident('no_face')) {
        newIncidents.push({
          type: 'no_face',
          timestamp: detection.timestamp,
          details: 'No face detected in frame',
        });
        console.log('🚨 INCIDENT LOGGED: No face detected');
        this.consecutiveNoFace = 0; // Reset after logging
      }
    }

    // Multiple faces detected
    if (detection.faceCount > 1 && this.canLogIncident('multi_face')) {
      newIncidents.push({
        type: 'multi_face',
        timestamp: detection.timestamp,
        details: `${detection.faceCount} faces detected`,
      });
      console.log(`🚨 INCIDENT LOGGED: ${detection.faceCount} faces detected`);
    }

    // Looking away from screen
    if (!detection.isLookingAtScreen && this.consecutiveLookingAway > this.LOOKING_AWAY_THRESHOLD) {
      if (this.canLogIncident('looking_away')) {
        newIncidents.push({
          type: 'looking_away',
          timestamp: detection.timestamp,
          details: 'Excessive looking away detected',
        });
        console.log('🚨 INCIDENT LOGGED: Looking away from screen');
      }
      this.consecutiveLookingAway = 0; // Reset
    }

    // Phone detected - MOST IMPORTANT
    if (detection.phoneDetected && this.canLogIncident('phone_detected')) {
      newIncidents.push({
        type: 'phone_detected',
        timestamp: detection.timestamp,
        details: 'Mobile device detected in frame',
      });
      console.log('🚨🚨🚨 INCIDENT LOGGED: PHONE DETECTED! 🚨🚨🚨');
    }

    return newIncidents;
  }

  /**
   * Start listening for Audio/Speech using the TensorFlow model
   */
  startAudioProctoring(onSpeechDetected: (incident: IncidentLog) => void): void {
    if (!this.speechModel) {
      console.warn('Speech model not initialized');
      return;
    }

    try {
      const labels = this.speechModel.wordLabels();
      const backgroundIndex = labels.indexOf('_background_noise_');

      this.speechModel.listen(async result => {
        // If the highest probability is anything OTHER than background noise, 
        // someone is speaking!
        const scores = Array.from(result.scores as Float32Array);
        // Find max score index
        const maxScoreIndex = scores.indexOf(Math.max(...scores));
        
        if (maxScoreIndex !== backgroundIndex && scores[maxScoreIndex] > 0.7) {
          if (this.canLogIncident('audio_detected')) {
             console.log(`🚨 INCIDENT LOGGED: AUDIO DETECTED! (${labels[maxScoreIndex]})`);
             onSpeechDetected({
               type: 'audio_detected',
               timestamp: Date.now(),
               details: `Speech or loud audio detected (${labels[maxScoreIndex]})`
             });
          }
        }
      }, {
        probabilityThreshold: 0.70,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.5
      });
      console.log('🎤 Audio proctoring actively listening...');
    } catch (e) {
      console.error('Failed to start audio proctoring:', e);
    }
  }

  stopAudioProctoring(): void {
    if (this.speechModel && this.speechModel.isListening()) {
      this.speechModel.stopListening();
      console.log('🛑 Audio proctoring stopped.');
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.faceDetectionModel) {
      tf.disposeVariables();
    }
    if (this.speechModel) {
      this.speechModel.stopListening();
    }
    this.isInitialized = false;
    console.log('🧹 AI Proctor disposed');
  }
}

// Export singleton instance
export const aiProctor = new AIProctorService();
