const firebaseConfig = {
    apiKey: "AIzaSyDp3Vr0l_WbvENgSuPAiN_zfzDTwYzYFzU",
    authDomain: "teambalancer-7720c.firebaseapp.com",
    projectId: "teambalancer-7720c"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  let currentUser = null;
  
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      document.getElementById("user-email").textContent = user.email;
      loadBalance();
      loadBetHistory();
    } else {
      location.href = "toto-auth.html";
    }
  });
  
  function logout() {
    auth.signOut().then(() => {
      location.href = "toto-auth.html";
    });
  }
  
  function loadBalance() {
    db.collection("users").doc(currentUser.uid).get().then(doc => {
      const balance = doc.data().balance || 0;
      document.getElementById("balance").textContent = `$${balance}`;
    });
  }
  
  function loadBetHistory() {
    const list = document.getElementById("bet-list");
    list.innerHTML = '<li>⏳ 로딩 중...</li>';
  
    db.collection("users").doc(currentUser.uid).collection("bets")
      .orderBy("timestamp", "desc")
      .get()
      .then(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) {
          list.innerHTML = '<li>베팅 내역이 없습니다.</li>';
          return;
        }
  
        snapshot.forEach(doc => {
          const bet = doc.data();
          const time = bet.timestamp?.toDate().toLocaleString() || "시간 없음";
          const payout = bet.resolved ? `💸 수익: $${bet.payout.toFixed(2)}` : "⏳ 결과 대기 중";
  
          const li = document.createElement("li");
          li.className = "bet-item";
          li.innerHTML = `
            <strong>${time}</strong><br>
            팀: ${bet.team} | 베팅: $${bet.amount} <br>
            ${payout}
          `;
          list.appendChild(li);
        });
      });
  }
  