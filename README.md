# FindIt — Campus Lost & Found

As part of our Web Programming course, we developed FindIt, a Lost & Found web application to learn and implement full-stack web development concepts. The project allows users to report lost and found items, manage reports, and identify potential matches between them.

We used HTML, CSS, JavaScript, Node.js, Express.js, and MongoDB to build the application, while implementing features such as user authentication, database management, and item matching. Through this project, we gained hands-on experience in developing a complete web application and applying web programming concepts to solve a real-world problem.


## What it does

- Students can report a lost item or an item they found
- The app compares all reports and shows possible matches (e.g. someone lost a black laptop, someone found a black laptop in the same building)
- Matching is based on category, keywords, location, color, and date
- Users can log in, view their own reports, and mark items as resolved

## Tech stack

- **Frontend:** Plain HTML, CSS, and JavaScript (no frameworks)
- **Backend:** Node.js with Express
- **Database:** MongoDB
- **Auth:** JWT tokens + bcrypt password hashing

## Project structure

```
FindIt-Lost-Found/
├── frontend/
│   ├── index.html          Main page (single-page app, all views here)
│   ├── css/
│   │   └── styles.css      All styles
│   └── js/
│       ├── data.js         API client (talks to the backend)
│       ├── matcher.js      Matching logic (runs in browser)
│       └── app.js          Page rendering and navigation
└── backend/
    ├── server.js           Express server entry point
    ├── package.json
    ├── .env                Environment variables (port, DB URL, JWT secret)
    ├── models/
    │   ├── User.js         User schema
    │   └── Item.js         Item schema
    ├── routes/
    │   ├── auth.js         Login, register, demo login
    │   └── items.js        CRUD for items + matching endpoints
    └── utils/
        └── matcher.js      Matching logic (runs on server)
```

## How to run

**Requirements:** Node.js and MongoDB installed locally.

1. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

2. Start MongoDB (if it is not already running):
   ```
   mongod
   ```

3. Start the backend server:
   ```
   npm run dev
   ```
   The server runs on http://localhost:5000

4. Open `frontend/index.html` in your browser directly, or serve it with a simple HTTP server:
   ```
   npx serve frontend
   ```

## Demo account

Use these credentials to log in without registering:
- Email: `demo@campus.edu`
- Password: `demo123`

Or just click "Continue as Demo User" on the login page.

## How the matching works

Each lost item is compared against each found item using a weighted score:

| Factor   | Weight | How it is measured |
|----------|--------|--------------------|
| Category | 30%    | Same category = full score |
| Keywords | 25%    | Fraction of shared keywords (Jaccard) |
| Location | 20%    | Word overlap between location strings |
| Color    | 10%    | Exact color match |
| Date     | 10%    | Within 5 days = full score, fades to 0 |
| Title    | 5%     | Character-pair similarity |

Any pair scoring 30 or above shows up on the Matches page.
