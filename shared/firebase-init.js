// 初始化 Firebase，提供記帳/投票/回憶留言的即時同步功能
// 依賴 firebase-app-compat.js + firebase-firestore-compat.js + firebase-config.js（須先載入）
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

window.TripDB = {
    listenExpenses(tripId, callback) {
        return db.collection('trips').doc(tripId).collection('expenses')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    },
    addExpense(tripId, expense) {
        return db.collection('trips').doc(tripId).collection('expenses').add({
            ...expense,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    deleteExpense(tripId, expenseId) {
        return db.collection('trips').doc(tripId).collection('expenses').doc(expenseId).delete();
    },

    listenPoll(tripId, pollId, callback) {
        return db.collection('trips').doc(tripId).collection('polls').doc(pollId)
            .onSnapshot(doc => callback(doc.exists ? doc.data() : { votes: {} }));
    },
    castVote(tripId, pollId, userId, choice) {
        return db.collection('trips').doc(tripId).collection('polls').doc(pollId)
            .set({ votes: { [userId]: choice } }, { merge: true });
    },

    // 必買清單勾選狀態（全團共用一份，value = 勾選人的 avatar）
    listenChecklist(tripId, callback) {
        return db.collection('trips').doc(tripId).collection('tools').doc('shopping')
            .onSnapshot(doc => callback(doc.exists ? (doc.data().checked || {}) : {}));
    },
    setChecklistItem(tripId, itemId, value) {
        return db.collection('trips').doc(tripId).collection('tools').doc('shopping')
            .set({ checked: { [itemId]: value === null ? firebase.firestore.FieldValue.delete() : value } }, { merge: true });
    },

    listenNotes(tripId, callback) {
        return db.collection('trips').doc(tripId).collection('notes')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    },
    addNote(tripId, note) {
        return db.collection('trips').doc(tripId).collection('notes').add({
            ...note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};
