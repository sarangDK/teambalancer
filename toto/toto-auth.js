// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDp3Vr0l_WbvENgSuPAiN_zfzDTwYzYFzU",
    authDomain: "teambalancer-7720c.firebaseapp.com",
    projectId: "teambalancer-7720c"
  };
  
  // Firebase 초기화
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // 로그인
  function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
  
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        // 로그인 후 관리자 이메일 
        const isAdmin = auth.currentUser.email === "admin@example.com";
        if (isAdmin) {
          location.href = "toto-admin.html";
        } else {
          location.href = "toto-bet.html";
        }
      })
      .catch(err => {
        Swal.fire("❌ 로그인 실패", err.message, "error");
      });
  }
  
  
  // 회원가입
  function register() {
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
  
    auth.createUserWithEmailAndPassword(email, password)
      .then(cred => {
        // 신규 유저에게 초기 금액 지급
        return db.collection("users").doc(cred.user.uid).set({
          email,
          balance: 1000 // 💵 10달러 초기 지급
        });
      })
      .then(() => {
        Swal.fire("🎉 회원가입 성공", "초기 금액 $10이 지급되었습니다!", "success");
        toggleLogin();
      })
      .catch(err => {
        Swal.fire("❌ 회원가입 실패", err.message, "error");
      });
  }
  
  // 비밀번호 재설정
  function resetPassword() {
    const email = document.getElementById("reset-email").value;
    auth.sendPasswordResetEmail(email)
      .then(() => {
        Swal.fire("📩 이메일 전송 완료", "비밀번호 재설정 메일을 보냈습니다.", "info");
      })
      .catch(err => {
        Swal.fire("❌ 오류", err.message, "error");
      });
  }
  
  // 화면 전환 함수들
  function toggleLogin() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";
    document.getElementById("reset-form").style.display = "none";
  }
  
  function toggleRegister() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
    document.getElementById("reset-form").style.display = "none";
  }
  
  function toggleReset() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "none";
    document.getElementById("reset-form").style.display = "block";
  }
  
  // 로그인 유지 시 자동 이동
  auth.onAuthStateChanged(user => {
    if (user) {
      if (user.email === "admin@example.com") {
        location.href = "toto-admin.html"; // 관리자 전용 페이지로 이동
      } else {
        location.href = "toto-bet.html"; // 일반 유저는 베팅 페이지로 이동
      }
    }
  });
  