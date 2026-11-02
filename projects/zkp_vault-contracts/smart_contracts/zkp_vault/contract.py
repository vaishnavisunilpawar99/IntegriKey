from algopy import (
    ARC4Contract,
    UInt64,
    Bytes,
    Global,
    Txn,
    arc4,
    BoxMap,
    String,
    itxn,
)

class ExamConfig(arc4.Struct):
    creator: arc4.Address
    duration_minutes: arc4.UInt64
    min_trust_score: arc4.UInt64

class ZKPVault(ARC4Contract):
    """
    IntegriKey Smart Contract
    Privacy-preserving AI proctoring on Algorand
    
    Simplified version using global state for demo purposes
    """
    
    def __init__(self) -> None:
        self.exams = BoxMap(String, ExamConfig)

    @arc4.abimethod(create="require")
    def create_application(self) -> None:
        """Initialize the contract"""
        pass

    @arc4.abimethod
    def create_exam(
        self,
        exam_id: arc4.String,
        duration: arc4.UInt64,
        min_score: arc4.UInt64,
    ) -> None:
        """
        Create a new exam registry.
        """
        key = exam_id.native
        assert key not in self.exams, "Exam already exists"
        
        self.exams[key] = ExamConfig(
            arc4.Address(Txn.sender), 
            duration, 
            min_score
        )

    @arc4.abimethod
    def submit_proof(
        self,
        exam_id: arc4.String,
        student_hash: arc4.String,
        trust_score: arc4.UInt64,
        proof_hash: arc4.String,
        ipfs_cid: arc4.String,
        zk_proof: arc4.DynamicBytes,
        public_inputs: arc4.DynamicArray[arc4.UInt64],
    ) -> arc4.String:
        """
        Submit exam proof for a student
        
        Args:
            exam_id: The exam identifier
            student_hash: Hashed student identity
            trust_score: Final trust score (0-100)
            proof_hash: SHA-256 hash of the proof data
            ipfs_cid: IPFS Content Identifier for the incident timeline
            zk_proof: Raw bytes emitted by the ZK Plonk frontend circuit
            public_inputs: Public constraints mapped into the circuit math
        """
        key = exam_id.native
        assert key in self.exams, "Exam does not exist"
        
        # 1. ZK-SNARK VERIFICATION
        assert self.verify_zk_snark(zk_proof, public_inputs), "ZK-SNARK Protocol Verifier Rejected Proof"
        
        # Verify trust score is valid (0-100)
        assert trust_score.native <= UInt64(100), "Trust score cannot exceed 100"
        assert trust_score.native >= UInt64(0), "Trust score cannot be negative"
        
        # If the trust score is extremely high, automatically mint an 
        # Integrity Certificate ASA using an inner transaction.
        if trust_score.native >= UInt64(90):
            itxn.AssetConfig(
                asset_name=String("IntegriKey - ") + key,
                unit_name=String("IKCERT"),
                total=1,
                decimals=0,
                url=ipfs_cid.native,
                manager=Global.current_application_address,
                reserve=Global.current_application_address,
                freeze=Global.current_application_address,
                clawback=Global.current_application_address,
            ).submit()
            
        return arc4.String("Proof submitted successfully")

    @arc4.abimethod
    def verify_submission(
        self,
        exam_id: arc4.String,
        student_hash: arc4.String,
        trust_score: arc4.UInt64,
        proof_hash: arc4.String,
    ) -> arc4.Bool:
        """
        Verify that a proof submission is valid
        
        Args:
            exam_id: The exam identifier
            student_hash: Hashed student identity
            trust_score: Final trust score (0-100)
            proof_hash: SHA-256 hash of the proof data
            
        Returns:
            True if valid
        """
        # Basic validation
        is_valid = (
            trust_score.native <= UInt64(100) and
            trust_score.native >= UInt64(0)
        )
        
        return arc4.Bool(is_valid)

    @arc4.abimethod
    def verify_zk_snark(
        self,
        zk_proof: arc4.DynamicBytes,
        public_inputs: arc4.DynamicArray[arc4.UInt64]
    ) -> arc4.Bool:
        """
        AlgoPlonk SNARK verification (Simulated for Hackathon MVP)
        In a production network, this utilizes algopy.op.EC pairing algorithms
        to mathematically enforce the privacy computations.
        """
        # Validate that the byte-array matches typical ZK-SNARK dimensions
        assert zk_proof.length >= UInt64(64), "Invalid ZK Proof byte dimensions"
        
        # Ensure public input constraints exist (usually the trust score and exam hash)
        assert public_inputs.length > UInt64(0), "Missing mathematical public inputs"
        
        return arc4.Bool(True)

    @arc4.abimethod
    def get_contract_info(self) -> arc4.String:
        """
        Get contract information
        
        Returns:
            Contract name and version
        """
        return arc4.String("IntegriKey v1.0 - Privacy-Preserving AI Proctoring")
