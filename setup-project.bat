@echo off
echo 🚀 Creating Mental Wellness Mirror Project Structure...

REM Create root directory
mkdir mental-wellness-mirror
cd mental-wellness-mirror

REM Frontend directories
mkdir frontend\css
mkdir frontend\js
mkdir frontend\assets\icons
mkdir frontend\assets\audio

REM Backend directories
mkdir backend\routes
mkdir backend\controllers
mkdir backend\services
mkdir backend\models
mkdir backend\utils
mkdir backend\python
mkdir backend\temp\audio

REM Database directory
mkdir database

REM Create empty files - Frontend
type nul > frontend\index.html
type nul > frontend\css\main.css
type nul > frontend\css\chat.css
type nul > frontend\css\charts.css
type nul > frontend\css\dark-mode.css
type nul > frontend\js\app.js
type nul > frontend\js\api.js
type nul > frontend\js\charts.js
type nul > frontend\js\darkMode.js
type nul > frontend\js\utils.js

REM Create empty files - Backend
type nul > backend\server.js
type nul > backend\routes\chatRoutes.js
type nul > backend\routes\moodRoutes.js
type nul > backend\routes\voiceRoutes.js
type nul > backend\routes\placeRoutes.js
type nul > backend\controllers\chatController.js
type nul > backend\controllers\moodController.js
type nul > backend\controllers\voiceController.js
type nul > backend\controllers\placeController.js
type nul > backend\services\groqService.js
type nul > backend\services\sentimentService.js
type nul > backend\services\databaseService.js
type nul > backend\services\ttsService.js
type nul > backend\services\foursquareService.js
type nul > backend\models\database.js
type nul > backend\utils\logger.js
type nul > backend\utils\validators.js
type nul > backend\python\sentiment_analyzer.py
type nul > backend\python\tts_generator.py

REM Create root files
type nul > .env
type nul > .env.example
type nul > .gitignore
type nul > package.json
type nul > requirements.txt
type nul > README.md
type nul > render.yaml

echo ✅ Project structure created successfully!
echo 📁 Location: %CD%
echo.
echo Next steps:
echo 1. Copy the provided code into respective files
echo 2. Run: npm install
echo 3. Run: pip install -r requirements.txt
echo 4. Run: node backend/server.js

pause