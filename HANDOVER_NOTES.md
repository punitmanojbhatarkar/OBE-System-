# AI OBE System - Agent Handover Notes

## 🎯 Current Context & Objectives
The user is building an AI-powered Outcome-Based Education (OBE) Management System using vanilla JS (frontend), FastAPI (backend), and SQLite. 
We were in the middle of fixing a **Universal Persistence Bug** where changes made in the UI (like adding users, changing HODs, adding courses) were not persisting to the backend, causing them to disappear upon page reload or navigation.

## ✅ What Has Been Accomplished So Far
1. **Backend Database Concurrency Fixed:** Added `timeout: 15` and `check_same_thread: False` to `database.py` to prevent SQLite lock errors.
2. **Missing `uid()` Function Fixed:** Added `import uuid` and a `uid()` helper function to `backend/main.py`. Previously, the backend was crashing with a 500 error when the frontend tried to send an object without an ID.
3. **Removed Breaking Features:** 
   - Removed `keepalive: true` from `api.js` `fetch` requests because it blocks CORS preflight (`OPTIONS`) requests for JSON data.
   - Removed an experimental file-logging middleware in `main.py` that crashed `uvicorn`.
4. **Frontend Serialization (`api.js`):** 
   - Implemented an `apiQueue` Promise chain to serialize all DB write operations so SQLite doesn't get concurrent write locks.
   - Fixed a critical bug where `patchDBWriteMethods` made UI save functions return Promises instead of synchronous objects (this is now fully resolved and `api.js` correctly returns synchronous objects to `data.js`).
   - Added a `beforeunload` event listener that prompts the user if they try to navigate away while `activeApiRequests > 0`.

## 🐛 The Current Unresolved Bug
The user reports that **changes made in the UI are STILL not saving permanently.**
However, I have verified the following:
* The backend is healthy. A manual Python `requests.put` to `http://127.0.0.1:8000/api/departments/dept-ds` successfully updates the SQLite database and returns `200 OK`.
* The FastAPI backend handles CORS preflight (`OPTIONS`) perfectly (`200 OK`).
* The problem **must exist purely in the frontend's browser network layer (`api.js`)**. 

**Suspicion for the next Agent:** 
Open the browser's Developer Tools (F12) -> Network tab and watch what happens when you click "Save" in the UI. 
- Is the `PUT`/`POST` request actually firing? 
- Is it failing silently in the JS console? 
- Is `syncFromBackend()` running too early/late and overwriting `localStorage`?
- Check the `apiFetch` function in `api.js` to ensure the Promise chain isn't silently swallowing an error or getting permanently stuck.

## 📝 Remaining Feature Backlog (Not Started)
The user previously requested these features which we haven't started yet:
1. **Research Paper Updates:** Update `artifacts/research_paper.tex` with auto-grading system details and a methodology diagram. Maintain a human, professional engineering tone (no "AI-sounding" language).
2. **Implement PDF Export:** Add "Download PDF" functionality to the NBA Reports and Attainment pages.
3. **Implement CSV/Excel Bulk Import:** Admin dashboard feature to upload student/course data in bulk.
4. **Implement Automated Remedial Emailing:** Automated email triggers for "weak" students based on attainment data.
5. **AI Chatbot Location Awareness:** The Chatbot needs to provide exact map locations/navigation to specific campus facilities.
