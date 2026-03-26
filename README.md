<<<<<<< HEAD
# 🧾 Divvit
> **AI-Powered Social Expense Splitting**

[![React Native](https://img.shields.io/badge/React_Native-v0.76-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-black.svg)](https://expo.dev/)
[![Python](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

**Divvit** is a cross-platform mobile application that simplifies splitting bills among friends. It uses **Computer Vision (Google Gemini 2.5)** to automatically parse receipts into line items and a **Real-time Multiplayer Engine** to allow groups to select their items synchronously on their own devices.

---

## 🏗 Architecture

The project follows a **Hybrid Microservice Architecture**:

| Service | Tech Stack | Responsibility |
| :--- | :--- | :--- |
| **Mobile App** | React Native, Expo, TypeScript | UI, Camera, State Management, Real-time Subscriptions. |
| **Backend API** | Python, FastAPI, Docker | Heavy compute, Receipt Parsing (AI), Data Normalization. |
| **Database** | Supabase (PostgreSQL) | User Auth, Persistence, Row Level Security (RLS). |
| **Infrastructure** | Google Cloud Run | Serverless container orchestration for the Python backend. |

---

## 🚀 Features

* **📸 AI Receipt Scanning:** Instantly converts physical receipts into digital line items using Google Gemini Vision.
* **⚡ Real-time Sync:** Changes made by one user (e.g., selecting "Pizza") are reflected instantly on all other users' devices via WebSockets.
* **🔗 Deep Linking:** Join active sessions instantly by clicking a link (`divvit-dev://bill/{id}`).
* **🔐 Secure Auth:** Enterprise-grade login with Apple, Google, and Magic Links.
* **💸 Smart Splitting:** Supports even splits, itemized splits, and custom adjustments.

---

## 🛠 Installation & Setup

### 1. Frontend (Mobile App)

The mobile client is built with Expo.

```bash
# Clone the repository
git clone [https://github.com/your-username/divvit.git](https://github.com/your-username/divvit.git)
cd divvit

# Install dependencies
npm install

# Setup Environment Variables
# Create a .env file in the root
echo "EXPO_PUBLIC_SUPABASE_URL=your_url" >> .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key" >> .env

# Run the Dev Client
npx expo start
=======
# 💸 Divvit

![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Divvit** is a full-stack mobile application that simplifies bill splitting and receipt parsing. Take a picture of your receipt, and Divvit uses Google's Gemini AI to instantly extract items, prices, taxes, and tips, allowing you to easily split the bill with friends. 

---

## ✨ Key Features

- **📸 AI Receipt Scanning**: Snap a photo or upload an image of a receipt. Our backend uses Google Gemini to semantically parse items, quantities, and prices automatically.
- **💵 Intuitive Bill Splitting**: Assign items to different people and calculate exact shares including proportional tax and tips.
- **🔐 Secure Authentication**: Fast and secure onboarding using Supabase Auth and Apple Authentication.
- **📱 Native Performance**: Built confidently with Expo and React Native, delivering a smooth mobile experience on iOS and Android.
- **☁️ Cloud-Ready Backend**: Stateless FastAPI Python application, containerized via Docker and ready for Google Cloud Run deployment.

---

## 🛠 Tech Stack

### Frontend (Mobile App)
- **Framework**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (via [NativeWind](https://www.nativewind.dev/))
- **Routing**: Expo Router
- **Fonts**: `@expo-google-fonts/outfit` & Lucide Icons
- **Auth/Database**: [Supabase](https://supabase.com/)

### Backend (API Serves)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **AI Processing**: Google GenAI (`google-genai`)
- **Server**: Uvicorn
- **Deployment**: Docker & Google Cloud Run

---

## 🚀 Getting Started

Follow these steps to get the project running locally.

### Prerequisites
- [Node.js](https://nodejs.org/) & `npm`
- [Python 3.9+](https://www.python.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A Supabase Project
- Google Gemini API Key

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file in the `backend` directory and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

5. **Run the FastAPI server:**
   ```bash
   fastapi dev main.py
   # OR
   uvicorn main:app --reload
   ```
   *The API will be available at `http://localhost:8000`*

### Frontend Setup

1. **Navigate to the root directory:**
   ```bash
   cd ..
   # (or if starting fresh, ensure you are in the project root)
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and configure your Supabase context:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the Expo development server:**
   ```bash
   npx expo start
   ```
   *Scan the QR code with your iOS (Camera app) or Android (Expo Go) device to view the app.*

---

## 📂 Project Structure

```text
Divvit-Rescue/
├── app/                      # Expo Router frontend screens
│   ├── (auth)/               # Authentication screens (Login/Signup)
│   ├── (tabs)/               # Main app navigation tabs
│   ├── bill/                 # Bill overview and breakdown UI
│   ├── camera/               # React Native camera integration
│   ├── onboarding/           # First-time user experience
│   └── _layout.tsx           # Root router layout
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/endpoints/    # API Route handlers (e.g., receipts.py)
│   │   └── services/         # Business logic & AI interaction (GeminiService)
│   ├── Dockerfile            # Container definition for Cloud Run
│   ├── main.py               # FastAPI application entry point
│   ├── requirements.txt      # Python dependencies
│   └── deploy.sh             # Deployment script
├── components/               # Reusable React Native components
├── constants/                # App-wide constants and theme config
├── hooks/                    # Custom React hooks
├── services/                 # Frontend API call wrappers
├── supabase/                 # Database migrations and config
├── assets/                   # Images, fonts, and icons
├── tailwind.config.js        # NativeWind/Tailwind styling config
└── app.config.ts             # Expo configuration (bundle ID, versions)
```

---

## 🌐 API Reference

### `POST /api/v1/receipts/scan`
Scans a receipt image and extracts structured data.

- **Accepts:** `multipart/form-data` (file: image/jpeg, image/png, etc.)
- **Response:**
  ```json
  {
    "items": [
      {
        "name": "Coffee",
        "price": 4.50,
        "quantity": 1
      }
    ],
    "subtotal": 4.50,
    "tax": 0.45,
    "total": 4.95,
    "scanned_tip": 1.00
  }
  ```

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License
*Please consult the project repository owner for specific licensing details.*
>>>>>>> 869266c (feat: Add README.md, implement bill data persistence, standardize subtotal calculation for the tip screen, and update iOS build number.)
