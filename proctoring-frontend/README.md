# AI-Powered Video Proctoring System 📹

![Status](https://img.shields.io/badge/status-active-success.svg)

An intelligent video proctoring system designed to monitor and ensure the integrity of online interviews or assessments. It uses real-time computer vision to detect candidate focus, flag unauthorized items, and generate a final integrity report.

## Core Features ✨

* **👁️ Focus & Gaze Tracking:** Detects if the candidate is looking away from the screen or is absent from the frame for an extended period.
* **🧍 Face Detection:** Ensures only one person is present and that the candidate's face is always visible.
* **📱 Object Detection:** Identifies unauthorized items like mobile phones, books, and other electronic devices using a pre-trained model.
* **📊 Real-time Event Logging:** Flags and logs all suspicious events with timestamps and associated integrity score deductions.
* **📈 Automated Reporting:** Generates a comprehensive PDF report at the end of each session, detailing all events and providing a final integrity score.
* **☁️ Cloud-Ready:** Includes a GitHub Actions workflow for seamless deployment to Microsoft Azure.

---

## Tech Stack 🛠️

#### Frontend:

* **React.js:** For building the user interface.
* **TensorFlow.js (COCO-SSD):** For real-time object detection in the browser.
* **MediaPipe (Face Mesh):** For high-fidelity face and gaze detection.
* **Axios:** For communicating with the backend API.
* **jsPDF & jspdf-autotable:** For generating PDF reports on the client-side.
* **Tailwind CSS:** For styling the user interface.

#### Backend:

* **Node.js & Express.js:** For the REST API and server logic.
* **Sequelize ORM:** To interact with the SQL database.
* **Azure SQL Database:** As the production database for storing session and event data.

---

## Installation & Setup ⚙️

Follow these steps to get the project running on your local machine.

### Prerequisites

* **Node.js & npm:** Make sure you have Node.js (version 18.x or higher) and npm installed.
* **Git:** To clone the repository.
* **SQL Database:** A running instance of SQL Server, PostgreSQL, or another Sequelize-compatible database for local development.

### 1. Backend Setup

First, clone the repository and set up the backend server.

```bash
# Clone the project from GitHub
git clone <your-repository-url>
cd proctoring-backend

# Install dependencies
npm install
```

Next, create a .env file in the proctoring-backend directory to store your database connection details.

.env file example:

```bash
# Your SQL Server Connection String
# Replace with your actual database credentials and details
DB_CONNECTION_STRING="mssql://username:password@localhost:1433/database_name"

# The port for the server to run on
PORT=5000
```

### 2. Frontend Setup

In a new terminal, navigate to the frontend directory and install its dependencies.

```bash
# Navigate to the frontend directory from the project root
cd ../proctoring-frontend

# Install dependencies
npm install
```

## Usage 🚀

To run the application, you need to start both the backend and frontend servers.

### 1. Start the Backend Server

In your first terminal, inside the proctoring-backend directory:

```bash
npm start
```

You should see a confirmation message that the server is running on port 5000 and has successfully connected to the database.

### 2. Start the Frontend Application

In your second terminal, inside the proctoring-frontend directory:

```bash
npm start
```

This will automatically open the application in your default web browser at http://localhost:3000.

### 3. Run a Proctoring Session

The application will open on the "Start New Session" screen.

* Click the button and enter the candidate's name when prompted.
* The proctoring session will begin. The video feed will be analyzed in real-time.
* Any suspicious events (looking away, phone detected, etc.) will appear in the "Event Log" on the right.
* When the interview is complete, click the "Stop Proctoring & Generate Report" button.
* You will be taken to the Report Page, which summarizes the session and allows you to download a PDF report and the session video recording.
