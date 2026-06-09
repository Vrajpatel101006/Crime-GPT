# CrimeGPT 2.0 🕵️‍♂️⚖️

🚀 **Live Deployment:** [https://crime-gpt-nine.vercel.app](https://crime-gpt-nine.vercel.app)

**CrimeGPT 2.0** is an AI-Powered Investigation, Documentation & Legal Intelligence Platform designed specifically for Indian Law Enforcement. It streamlines case management, evidence tracking, and legal documentation using advanced AI capabilities.

## 🌟 Features

- **AI Investigation Assistant:** Analyze case details and get intelligent suggestions for legal proceedings.
- **Case Diary Management:** Secure, organized, and digital logging of daily investigation progress.
- **Evidence Tracking:** Maintain an immutable chain of custody for all digital and physical evidence.
- **Legal Intelligence:** Quick access to Indian Penal Code (IPC), CRPC, and historical case laws.
- **Secure Authentication:** Role-based access control for officers and admins.
- **Audit Logs:** Track every action taken within the platform for accountability.

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** CSS / TailwindCSS
- **Backend/Database:** Firebase (Authentication, Realtime Database, Storage)
- **Deployment:** Vercel

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/progammer24052025-png/Crime-GPT.git
   cd Crime-GPT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_DATABASE_URL=your_database_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Visit `http://localhost:5173` in your browser.

## 🌐 Deployment

This project is currently deployed and live on **Vercel**:
👉 **[Visit CrimeGPT 2.0](https://crime-gpt-nine.vercel.app)**

*Remember to add your `.env` variables to the Vercel Dashboard under Settings > Environment Variables before deploying any new instances.*

## 📄 License
This project is proprietary and intended for authorized law enforcement personnel only.
