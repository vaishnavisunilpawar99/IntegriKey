import * as algosdk from 'algosdk';
import { SessionData } from './ai-proctor-service';
import { PeraWalletConnect } from '@perawallet/connect';

// Algorand configuration
const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
export const indexerClient = new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', 443);

// Contract app ID (set after deployment)
// let APP_ID = 755317770; // TODO: Replace with actual App ID after deployment
let APP_ID = 758776180;

export function setAppId(appId: number) {
  APP_ID = appId;
}

export function getAppId(): number {
  return APP_ID;
}

/**
 * Submit proof to Algorand blockchain
 */
export async function submitProofToBlockchain(
  sessionData: SessionData,
  ipfsCid: string,
  zkProofPayload: { proofBytes: Uint8Array, publicInputs: bigint[] },
  senderAddress: string,
  peraWallet: PeraWalletConnect
): Promise<string> {
  try {
    console.log('📤 Submitting proof to Algorand...');
    console.log('Sender address:', senderAddress);

    const suggestedParams = await algodClient.getTransactionParams().do();

    const method = new algosdk.ABIMethod({
      name: 'submit_proof',
      args: [
        { type: 'string', name: 'exam_id' },
        { type: 'string', name: 'student_hash' },
        { type: 'uint64', name: 'trust_score' },
        { type: 'string', name: 'proof_hash' },
        { type: 'string', name: 'ipfs_cid' },
        { type: 'byte[]', name: 'zk_proof' },
        { type: 'uint64[]', name: 'public_inputs' }
      ],
      returns: { type: 'string' }
    });

    const atc = new algosdk.AtomicTransactionComposer();

    const sharedSigner = async (txns: algosdk.Transaction[]) => {
      const txnsToSign = txns.map(t => ({ txn: t, signers: [senderAddress] }));
      return await peraWallet.signTransaction([txnsToSign]);
    };

    // If trust score >= 90, the smart contract will mint an ASA (Integrity Certificate)
    // We must deposit ALGO to cover the ASA Minimum Balance Requirement (MBR)
    if (sessionData.trustScore >= 90) {
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: senderAddress,
        receiver: algosdk.getApplicationAddress(APP_ID),
        amount: 100000,
        suggestedParams
      });

      atc.addTransaction({
        txn: paymentTxn,
        signer: sharedSigner
      });
    }

    atc.addMethodCall({
      appID: APP_ID,
      method: method,
      methodArgs: [
        sessionData.examId,
        sessionData.studentHash,
        sessionData.trustScore,
        sessionData.proofHash,
        ipfsCid,
        zkProofPayload.proofBytes,
        zkProofPayload.publicInputs
      ],
      sender: senderAddress,
      suggestedParams: suggestedParams,
      boxes: [
        {
          appIndex: 0,
          name: new Uint8Array([
            ...new TextEncoder().encode('exams'),
            ...new TextEncoder().encode(sessionData.examId)
          ])
        }
      ],
      signer: sharedSigner
    });

    const result = await atc.execute(algodClient, 4);
    const txid = result.txIDs[0];

    console.log('✅ Proof submitted! Transaction ID:', txid);
    return txid;
  } catch (error) {
    console.error('❌ Failed to submit proof:', error);
    throw error;
  }
}

export async function getAccountInfo(address: string): Promise<any> {
  try {
    return await algodClient.accountInformation(address).do();
  } catch (error) {
    console.error('Failed to get account info:', error);
    throw error;
  }
}

export function formatAlgoAmount(microAlgos: number): string {
  return (microAlgos / 1_000_000).toFixed(6);
}

export async function estimateTransactionFee(): Promise<number> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();
    return Number(suggestedParams.fee || suggestedParams.minFee);
  } catch (error) {
    console.error('Failed to estimate fee:', error);
    return 1000;
  }
}


export async function getExamProofs(examId: string): Promise<any[]> {
  console.log('Querying proofs for exam from Indexer:', examId);
  try {
    const response = await indexerClient.searchForTransactions()
      .applicationID(APP_ID)
      .limit(100)
      .do();

    const proofs: any[] = [];

    // Method signature for submit_proof
    const method = new algosdk.ABIMethod({
      name: 'submit_proof',
      args: [
        { type: 'string', name: 'exam_id' },
        { type: 'string', name: 'student_hash' },
        { type: 'uint64', name: 'trust_score' },
        { type: 'string', name: 'proof_hash' },
        { type: 'string', name: 'ipfs_cid' },
        { type: 'byte[]', name: 'zk_proof' },
        { type: 'uint64[]', name: 'public_inputs' }
      ],
      returns: { type: 'string' }
    });

    const methodSelector = method.getSelector();

    // Pull local cache to extract non-chain metrics (academic score, incidents)
    let localProofs: any[] = [];
    try {
      const stored = localStorage.getItem('zkp_vault_proofs');
      if (stored) localProofs = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local proofs', e);
    }

    for (const tx of response.transactions as any[]) {
      if (!tx.applicationTransaction) continue;

      const appArgs = tx.applicationTransaction.applicationArgs;
      if (!appArgs || appArgs.length === 0) continue;

      const isSubmitProof =
        appArgs[0].length === 4 &&
        appArgs[0][0] === methodSelector[0] &&
        appArgs[0][1] === methodSelector[1] &&
        appArgs[0][2] === methodSelector[2] &&
        appArgs[0][3] === methodSelector[3];

      if (isSubmitProof && appArgs.length === 8) {
        try {
          // appArgs elements are Uint8Arrays directly returned by the indexer SDK
          const decodedExamId = new algosdk.ABIStringType().decode(appArgs[1]).valueOf() as string;

          if (decodedExamId === examId) {
            const studentHash = new algosdk.ABIStringType().decode(appArgs[2]).valueOf() as string;
            const trustScore = new algosdk.ABIUintType(64).decode(appArgs[3]).valueOf() as bigint;
            const proofHash = new algosdk.ABIStringType().decode(appArgs[4]).valueOf() as string;
            const ipfsCid = new algosdk.ABIStringType().decode(appArgs[5]).valueOf() as string;

            // Merge local academic score and incidents based on matching proof hash
            const matchedLocalProof = localProofs.find(p => p.proofHash === proofHash && p.examId === decodedExamId);

            proofs.push({
              studentHash,
              trustScore: Number(trustScore),
              academicScore: matchedLocalProof?.academicScore,
              proofHash,
              timestamp: tx.roundTime ? tx.roundTime * 1000 : Date.now(),
              examId: decodedExamId,
              incidents: matchedLocalProof?.incidents || 0,
              txId: tx.id,
              ipfsCid,
            });
          }
        } catch (e) {
          console.warn("Error decoding transaction arguments:", e);
        }
      }
    }

    return proofs;
  } catch (error) {
    console.error('Failed to get exam proofs from Indexer:', error);
    return [];
  }
}

export async function getExamMetadata(examId: string): Promise<any> {
  return {
    examId,
    startTime: Date.now(),
    endTime: Date.now() + 3600000,
    isActive: true,
  };
}

export async function createExam(
  examId: string,
  durationMinutes: number,
  minTrustScore: number,
  creatorAddress: string,
  signerFunction: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>
): Promise<string> {
  console.log('Creating exam on chain:', examId);
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Payment to fund box Minimum Balance Requirement (MBR)
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: creatorAddress,
      receiver: algosdk.getApplicationAddress(APP_ID),
      amount: 200000, // 0.2 ALGO to safely cover MBR
      suggestedParams
    });

    const method = new algosdk.ABIMethod({
      name: 'create_exam',
      args: [
        { type: 'string', name: 'exam_id' },
        { type: 'uint64', name: 'duration' },
        { type: 'uint64', name: 'min_score' }
      ],
      returns: { type: 'void' }
    });

    const boxName = new Uint8Array([
      ...new TextEncoder().encode('exams'),
      ...new TextEncoder().encode(examId)
    ]);

    const atc = new algosdk.AtomicTransactionComposer();

    const sharedSigner = async (txns: algosdk.Transaction[]) => await signerFunction(txns);

    atc.addTransaction({
      txn: paymentTxn,
      signer: sharedSigner
    });

    atc.addMethodCall({
      appID: APP_ID,
      method: method,
      methodArgs: [examId, durationMinutes, minTrustScore],
      sender: creatorAddress,
      suggestedParams: suggestedParams,
      boxes: [{ appIndex: 0, name: boxName }],
      signer: sharedSigner
    });

    const result = await atc.execute(algodClient, 4);
    const txid = result.txIDs[1] || result.txIDs[0];

    console.log('✅ Exam created! Transaction ID:', txid);
    return txid;
  } catch (error) {
    console.error('❌ Failed to create exam:', error);
    throw error;
  }
}

export function getExplorerUrl(txId: string): string {
  return `https://lora.algokit.io/testnet/transaction/${txId}`;
}

export async function verifyProofExists(
  examId: string,
  studentHash: string,
  callerAddress: string
): Promise<boolean> {
  return false;
}

export interface ProofSubmissionResult {
  txId: string;
  explorerUrl: string;
  confirmationRound: number;
}

export interface ExamCreationResult {
  txId: string;
  explorerUrl: string;
  examId: string;
}
