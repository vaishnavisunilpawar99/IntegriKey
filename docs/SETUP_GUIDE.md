# IntegriKey Setup & Deployment Guide

## 🎯 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- AlgoKit CLI
- Algorand wallet (Pera Wallet recommended)

---

## 📦 Step 1: Install Dependencies

### Backend (Smart Contracts)
```bash
cd zkp_vault/projects/zkp_vault-contracts
algokit project bootstrap all
```

### Frontend
```bash
cd zkp_vault/projects/zkp_vault-frontend
npm install
```

---

## 🔧 Step 2: Configure Smart Contracts

### Replace the default contract
```bash
# Navigate to smart contract directory
cd zkp_vault/projects/zkp_vault-contracts/smart_contracts/zkp_vault

# Replace contract.py with our zkp_vault_contract.py
cp /path/to/zkp_vault_contract.py contract.py
```

### Build the contract
```bash
algokit project run build
```

---

## 🚀 Step 3: Deploy to Algorand TestNet

### Start LocalNet (for testing)
```bash
algokit localnet start
```

### Or use TestNet
Update `config.py` to use TestNet:
```python
# In config.py
NETWORK = "testnet"
ALGOD_SERVER = "https://testnet-api.algonode.cloud"
```

### Deploy the contract
```bash
algokit project deploy testnet
```

**Save the App ID** - you'll need this for the frontend!

Example output:
```
✅ Smart contract deployed!
App ID: 123456789
```

---

## 🎨 Step 4: Configure Frontend

### Update Algorand configuration
Create `src/config/algorand.ts`:

```typescript
export const ALGORAND_CONFIG = {
  APP_ID: 123456789, // Replace with your deployed App ID
  NETWORK: 'testnet',
  ALGOD_SERVER: 'https://testnet-api.algonode.cloud',
  ALGOD_PORT: 443,
  ALGOD_TOKEN: '',
};
```

### Copy AI and UI components
```bash
cd zkp_vault/projects/zkp_vault-frontend/src

# Create services directory
mkdir -p services components

# Copy service files
cp /path/to/ai-proctor-service.ts services/
cp /path/to/algorand-service.ts services/

# Copy components
cp /path/to/StudentExam.tsx components/
cp /path/to/StudentExam.css components/
cp /path/to/AdminDashboard.tsx components/
cp /path/to/AdminDashboard.css components/
```

---

## 🧪 Step 5: Test Locally

### Start the frontend
```bash
cd zkp_vault/projects/zkp_vault-frontend
npm run dev
```

### Access the application
- Student Interface: `http://localhost:5173/exam`
- Admin Dashboard: `http://localhost:5173/admin`

---

## 🌐 Step 6: Deploy Frontend (Vercel)

### Connect to Vercel
```bash
npm install -g vercel
vercel login
```

### Deploy
```bash
cd zkp_vault/projects/zkp_vault-frontend
vercel --prod
```

### Environment Variables (set in Vercel dashboard)
- `VITE_APP_ID`: Your Algorand App ID
- `VITE_NETWORK`: `testnet` or `mainnet`

---

## 🔑 Step 7: Wallet Integration

### Install Pera Wallet
Students and admins need Pera Wallet:
- Mobile: Download from App Store / Google Play
- Browser: Install Pera Wallet Chrome extension

### Get TestNet ALGO
For testing, get free TestNet ALGO:
1. Visit: https://bank.testnet.algorand.network/
2. Enter your wallet address
3. Click "Dispense"

---

## 🎬 Step 8: Demo Flow

### As Instructor (Admin)
1. Connect wallet
2. Navigate to Admin Dashboard
3. Click "Create Exam"
4. Fill in:
   - Exam ID: `CS101_FINAL_2024`
   - Duration: `120` minutes
   - Min Trust Score: `70`
5. Sign transaction
6. Share exam link with students

### As Student
1. Open exam link
2. Connect wallet
3. Allow camera access
4. Click "Start Exam"
5. AI monitors in real-time
6. Complete exam
7. Click "Submit Exam"
8. Sign transaction
9. Receive confirmation with Algorand Explorer link

### Verify on Blockchain
1. Copy transaction ID
2. Visit: https://testnet.algoexplorer.io/
3. Paste transaction ID
4. View immutable proof on blockchain

---

## 🛠️ Troubleshooting

### Camera not working
- Grant camera permissions in browser settings
- Use HTTPS or localhost (HTTP doesn't allow camera access)
- Check browser console for errors

### AI models not loading
- Check network connection
- Models download from CDN (may take time on first load)
- Clear browser cache and reload

### Wallet connection fails
- Ensure Pera Wallet is installed
- Check wallet is on correct network (TestNet/MainNet)
- Try disconnecting and reconnecting

### Transaction fails
- Ensure wallet has sufficient ALGO for fees (~0.001 ALGO)
- Check App ID is correct
- Verify exam is active and within time window
- Check browser console for detailed error

### Box storage errors
If you see "box does not exist":
- Ensure contract was deployed with box storage enabled
- Check you're calling the correct App ID
- Verify exam was created successfully first

---

## 📊 Monitoring & Analytics

### View all transactions
```bash
# Get app transactions
algokit goal app info --app-id YOUR_APP_ID
```

### Query box storage
```bash
# List all boxes
curl https://testnet-api.algonode.cloud/v2/applications/YOUR_APP_ID/boxes

# Get specific box
curl https://testnet-api.algonode.cloud/v2/applications/YOUR_APP_ID/box?name=EXAM_ID
```

---

## 🔒 Security Best Practices

### For Production
1. **Rate Limiting**: Implement on frontend to prevent spam
2. **Exam Authentication**: Add password or invite-only access
3. **Wallet Whitelisting**: Optionally restrict to known student wallets
4. **Audit Logging**: Monitor all admin actions
5. **HTTPS Only**: Never deploy without SSL certificate

### Privacy Guarantees
✅ Video NEVER leaves student's device
✅ Only hashes and scores on blockchain
✅ Student identity hashed (irreversible)
✅ No PII (Personally Identifiable Information)
✅ Open-source verifiable code

---

## 🎯 Hackathon Demo Checklist

- [ ] Smart contract deployed to TestNet
- [ ] App ID saved and configured
- [ ] Frontend deployed to Vercel
- [ ] Wallet with TestNet ALGO
- [ ] Camera/webcam working
- [ ] Test exam created
- [ ] Mock student proof submitted
- [ ] Admin dashboard showing data
- [ ] Blockchain explorer link working
- [ ] Presentation slides ready
- [ ] Demo video recorded (backup)

---

## 📚 Additional Resources

### Algorand
- Docs: https://developer.algorand.org/
- PyTeal: https://pyteal.readthedocs.io/
- AlgoSDK JS: https://algorand.github.io/js-algorand-sdk/

### TensorFlow.js
- Docs: https://www.tensorflow.org/js
- Models: https://github.com/tensorflow/tfjs-models

### Wallets
- Pera Wallet: https://perawallet.app/
- Defly Wallet: https://defly.app/

---

## 🏆 Winning Demo Script

**Opening (30 sec)**
"Traditional AI proctoring violates student privacy by uploading video. We solved this with IntegriKey - AI runs locally, only cryptographic proofs go to Algorand blockchain."

**Student Demo (90 sec)**
1. Show webcam with AI overlays
2. Point out "Privacy Mode Active"
3. Trigger incidents (look away, show phone)
4. Submit proof
5. Show transaction on Algorand Explorer

**Admin View (45 sec)**
1. Switch to admin dashboard
2. Show new proof appeared
3. Click blockchain link
4. Highlight: "No video, just proof"

**Technical Deep Dive (45 sec)**
1. Show code: local AI detection
2. Show smart contract: proof storage
3. Mention AlgoPlonk compatibility
4. Emphasize: beginner-friendly, privacy-first

**Closing (15 sec)**
"IntegriKey: AI automation + Blockchain trust + Zero-knowledge privacy. Perfect for campus systems. Thank you!"

---

## 🚀 Next Steps After Hackathon

### v1.1 Features
- Multi-exam support
- Instructor dashboard analytics
- Email notifications
- PDF report generation

### v2.0 Features
- Full ZK-SNARK implementation with AlgoPlonk
- Federated learning for AI improvement
- Mobile app (React Native)
- Integration with LMS (Canvas, Moodle)

### Production Deployment
- Migrate to Algorand MainNet
- Professional UI/UX design
- Security audit
- Beta testing with real university

---

**Good luck with your hackathon! 🎉**

For questions or issues:
- Check documentation above
- Review code comments
- Debug with browser console
- Test with AlgoKit debugging tools
