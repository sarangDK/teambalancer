// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyDp3Vr0l_WbvENgSuPAiN_zfzDTwYzYFzU",
    authDomain: "teambalancer-7720c.firebaseapp.com",
    projectId: "teambalancer-7720c"
  };
  firebase.initializeApp(firebaseConfig);
  
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  const matchListElem = document.getElementById("matchList");
  const userInfoElem = document.getElementById("user-info");
  
  let currentUser = null;
  
  // ✅ 로그인된 유저 확인
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      Swal.fire("로그인이 필요합니다", "", "warning").then(() => {
        location.href = "toto-auth.html";
      });
      return;
    }
  
    currentUser = user;
    const userDoc = await db.collection("users").doc(user.uid).get();
    const balance = userDoc.data()?.balance || 0;
  
    userInfoElem.innerHTML = `
      <p><strong>${user.email}</strong> 님 | 잔액: 💰 $${balance.toFixed(2)}</p>
      <button onclick="logout()">로그아웃</button>
    `;
  
    loadMatches();
  });
  
  function logout() {
    auth.signOut().then(() => {
      location.href = "toto-auth.html";
    });
  }
  
  // ✅ 진행 중인 경기 불러오기
  function loadMatches() {
    db.collection("matches")
      .where("status", "==", "진행중")
      .orderBy("createdAt", "desc")
      .get()
      .then(snapshot => {
        matchListElem.innerHTML = "";
  
        if (snapshot.empty) {
          matchListElem.innerHTML = "<li>⛔ 현재 진행 중인 경기가 없습니다.</li>";
          return;
        }
  
        snapshot.forEach(doc => {
            const match = doc.data();
          
            const deadline = new Date(match.deadline);  // 
            const startTime = new Date(match.startTime); // 🔥 수정!
            const now = new Date();
            const isExpired = now > deadline;
          
            const li = document.createElement("li");
            li.innerHTML = `
              <h3>${match.matchId}</h3>
              <p>시작 시간: ${startTime.toLocaleString()}</p>
              <p>마감 시간: ${deadline.toLocaleString()}</p>
              <div style="margin-top:8px;">
                <input type="number" id="amount-${match.matchId}" placeholder="$ 금액" min="1" style="padding:6px; width:80px;">
                <button ${isExpired ? "disabled" : ""} onclick="placeBet('${match.matchId}', '블루')">🔵 블루</button>
                <button ${isExpired ? "disabled" : ""} onclick="placeBet('${match.matchId}', '레드')">🔴 레드</button>
              </div>
            `;
            matchListElem.appendChild(li);
          });
      });
  }
  
  // ✅ 베팅 처리
  async function placeBet(matchId, team) {
    const amountInput = document.getElementById(`amount-${matchId}`);
    const amount = parseFloat(amountInput.value);
  
    if (!amount || amount <= 0) {
      return Swal.fire("⚠️ 금액 오류", "올바른 베팅 금액을 입력해주세요!", "warning");
    }
  
    const userDocRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userDocRef.get();
    const balance = userDoc.data()?.balance || 0;
  
    if (balance < amount) {
      return Swal.fire("❌ 잔액 부족", "보유 금액이 부족합니다.", "error");
    }
  
    // 이미 베팅했는지 확인
    const betSnapshot = await db.collection("bets")
      .where("matchId", "==", matchId)
      .where("uid", "==", currentUser.uid)
      .get();
  
    if (!betSnapshot.empty) {
      return Swal.fire("❌ 이미 베팅 완료", "이 경기에 이미 베팅했습니다.", "error");
    }
  
    // 베팅 저장
    await db.collection("bets").add({
      uid: currentUser.uid,
      email: currentUser.email,
      matchId,
      team,
      amount,
      resolved: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  
    // 잔액 차감
    await userDocRef.update({
      balance: firebase.firestore.FieldValue.increment(-amount)
    });
  
    Swal.fire("✅ 베팅 완료", `${team}팀에 $${amount} 베팅 완료!`, "success").then(() => {
      location.reload(); // 페이지 새로고침 (잔액 반영)
    });
  }
  