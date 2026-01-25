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
