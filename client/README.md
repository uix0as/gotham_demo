# Gotham client

React + Vite + JavaScript SPA입니다. src/main.jsx → App.jsx → pages를 실행합니다. React Router, Axios, Tailwind CSS, Lucide, Recharts를 사용합니다. 기존 승인된 대시보드와 모든 페이지의 CSS·로컬 폰트를 보존했습니다.

루트에서 npm run setup 후 npm run dev:client로 실행합니다. 기본 http://localhost:5173, /api 프록시는 Express http://localhost:5000입니다. client/.env.local의 API_PROXY_TARGET으로 포트를 바꿀 수 있습니다. VITE_API_BASE_URL 기본값은 /api이고 비밀정보를 넣으면 안 됩니다.

npm run build는 client/dist를 생성합니다. 루트 npm start로 Express에서 빌드와 API를 함께 제공합니다. 자세한 실행은 ../README_SCHOOL_SETUP.md, API 규격은 ../docs/API_CONTRACT.md를 참고합니다.
