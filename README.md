# Freshy Fishy
**การติดตั้งแบบทั่วไป**
1. Clone Repo
   ```
   git clone https://github.com/Jxuu03/s65114540011.git
   ```
2. Create and switch venv
   ```
   python -m venv venv
   ```
3. Install requirements
   ```
   cd Backend
   ```
   ```
   pip install -r requirements.txt
   ```
4. Run backend server
   ```
   python manage.py runserver
   ```
5. New Terminal and run frontend section
   ```
   cd FreshyFishy
   ```
   ```
   cd Frontend
   ```
   ```
   cd iot_frontend
   ```
   ```
   npm start
   ```
6. If no npm, run
   ```
   npm install
   ```

**การติดตั้งบน Docker**
1. ในหน้าต่าง Docker ไปที่ Terminal จากนั้น Clone Repo
   ```
   git clone https://github.com/Jxuu03/s65114540011.git
   ```
2. Build
   ```
   docker compose up -d --build
   ```
3. ถ้าสำเร็จ จะเห็นหน้าเว็บที่ http://localhost:10011/
