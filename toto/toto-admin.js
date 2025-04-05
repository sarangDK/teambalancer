// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDp3Vr0l_WbvENgSuPAiN_zfzDTwYzYFzU",
  authDomain: "teambalancer-7720c.firebaseapp.com",
  projectId: "teambalancer-7720c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const adminEmail = "admin@example.com";

const matchListElem = document.getElementById("matchList");
const betListElem = document.getElementById("betList");
const matchDetail = document.getElementById("match-detail");
const currentMatchIdElem = document.getElementById("currentMatchId");
const adminInfo = document.getElementById("admin-info");

let currentMatchId = null;

// 로그인 확인
auth.onAuthStateChanged(user => {
  if (!user || user.email !== adminEmail) {
    Swal.fire("접근 불가", "관리자 전용 페이지입니다.", "error").then(() => {
      location.href = "toto-auth.html";
    });
  } else {
    adminInfo.innerHTML = `<p><strong>${user.email}</strong> 관리자님 환영합니다.</p>
    <button onclick="logout()">로그아웃</button>`;
    loadMatches();
  }
});

function logout() {
  auth.signOut().then(() => {
    location.href = "toto-auth.html";
  });
}

// ✅ 경기 개설
// ✅ 경기 개설
function createMatch() {
  const matchId = document.getElementById("newMatchId").value.trim();
  if (!matchId) return Swal.fire("⚠️ 입력 필요", "경기 ID를 입력해주세요!", "warning");

  const now = new Date();
  const deadline = new Date(now.getTime() + 3 * 60 * 1000); // 3분 뒤 마감
  const startTime = new Date(deadline.getTime()); // 시작 시간 = 마감 시간

  db.collection("matches").doc(matchId).set({
    matchId,
    startTime: startTime.toISOString(),
    deadline: deadline.toISOString(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "진행중"
  })
  .then(() => {
    Swal.fire("✅ 경기 개설 완료", `${matchId} 경기가 등록되었습니다.`, "success");
    document.getElementById("newMatchId").value = "";
    loadMatches();
  })
  .catch(err => {
    Swal.fire("❌ 오류", err.message, "error");
  });
}


// ✅ 경기 목록 불러오기
function loadMatches() {
  matchListElem.innerHTML = "";

  db.collection("matches")
    .orderBy("createdAt", "desc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        matchListElem.innerHTML = "<li>⚠️ 아직 생성된 경기가 없습니다.</li>";
        return;
      }

      snapshot.forEach(doc => {
        const match = doc.data();
        if (match.status !== "완료") {
          const li = document.createElement("li");
          li.textContent = `${match.matchId} (시작: ${new Date(match.startTime).toLocaleTimeString()})`;
          li.style.cursor = "pointer";
          li.onclick = () => showMatchDetails(match.matchId);
          matchListElem.appendChild(li);
        }
      });
    });
}

// ✅ 경기 상세 보기 + 베팅 내역 표시
function showMatchDetails(matchId) {
  currentMatchId = matchId;
  currentMatchIdElem.textContent = matchId;
  matchDetail.style.display = "block";
  betListElem.innerHTML = "";

  db.collection("bets")
    .where("matchId", "==", matchId)
    .where("resolved", "==", false)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        betListElem.innerHTML = "<li>⛔ 처리할 베팅이 없습니다.</li>";
        return;
      }

      snapshot.forEach(doc => {
        const bet = doc.data();
        const li = document.createElement("li");
        li.textContent = `${bet.email} - ${bet.team} 팀에 $${bet.amount} 베팅`;
        betListElem.appendChild(li);
      });
    });
}

// ✅ 경기 결과 처리
function resolveMatch(winnerTeam) {
  if (!currentMatchId) return;

  db.collection("bets")
    .where("matchId", "==", currentMatchId)
    .where("resolved", "==", false)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      const payouts = {};

      snapshot.forEach(doc => {
        const bet = doc.data();
        const ref = db.collection("bets").doc(doc.id);
        const isWinner = bet.team === winnerTeam;
        const payoutAmount = isWinner ? bet.amount * 1.9 : 0;

        batch.update(ref, {
          resolved: true,
          payout: payoutAmount,
          winner: winnerTeam
        });

        if (isWinner) {
          if (!payouts[bet.uid]) payouts[bet.uid] = 0;
          payouts[bet.uid] += payoutAmount;
        }
      });

      const payoutPromises = Object.keys(payouts).map(uid => {
        return db.collection("users").doc(uid).update({
          balance: firebase.firestore.FieldValue.increment(payouts[uid])
        });
      });

      return batch.commit().then(() => Promise.all(payoutPromises));
    })
    // ✅ 여기에서 경기 상태를 '완료'로 변경
    .then(() => {
      return db.collection("matches").doc(currentMatchId).update({
        status: "완료"
      });
    })
    .then(() => {
      Swal.fire("✅ 처리 완료", `${currentMatchId} 경기를 '${winnerTeam}'팀 승리로 처리했습니다.`, "success");
      matchDetail.style.display = "none";
      loadMatches(); // 목록 갱신
    })
    .catch(err => {
      console.error(err);
      Swal.fire("❌ 오류 발생", err.message, "error");
    });
}

async function giveMoneyToUser() {
  const email = document.getElementById("targetEmail").value.trim();
  const amount = parseFloat(document.getElementById("giveAmount").value);

  if (!email || !amount || amount <= 0) {
    return Swal.fire("⚠️ 입력 오류", "이메일과 금액을 정확히 입력해주세요.", "warning");
  }

  try {
    // 해당 이메일로 유저 조회
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      return Swal.fire("❌ 유저 없음", "해당 이메일을 가진 유저를 찾을 수 없습니다.", "error");
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
      balance: firebase.firestore.FieldValue.increment(amount)
    });

    Swal.fire("✅ 지급 완료", `${email}님에게 $${amount} 지급 완료!`, "success");

    // 입력 필드 초기화
    document.getElementById("targetEmail").value = "";
    document.getElementById("giveAmount").value = "";

  } catch (err) {
    console.error(err);
    Swal.fire("❌ 오류 발생", err.message, "error");
  }
}

