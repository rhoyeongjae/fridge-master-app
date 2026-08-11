import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DEV_IP = "172.30.13.172";
const API = `http://${DEV_IP}:3000`;

export default function Index() {
  // ── 인증 상태
  const [screen, setScreen] = useState<"login" | "register" | "main">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [loggedUser, setLoggedUser] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // ── 식재료 상태
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expiry, setExpiry] = useState("");
  const [category, setCategory] = useState("신선");
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    if (token) loadItems();
  }, [token]);

  // ── 로그인
  async function login() {
    if (!username || !password) {
      Alert.alert("아이디와 비밀번호를 입력하세요");
      return;
    }
    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("오류", data.error);
        return;
      }
      setToken(data.token);
      setLoggedUser(data.username);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setScreen("main");
    } catch {
      Alert.alert("오류", "서버에 연결할 수 없습니다");
    }
  }

  // ── 회원가입
  async function register() {
    if (!username || !password || !confirmPassword) {
      Alert.alert("모든 항목을 입력하세요");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("오류", "비밀번호가 일치하지 않습니다");
      return;
    }
    try {
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("오류", data.error);
        return;
      }
      Alert.alert("완료", "회원가입 성공! 로그인 해주세요");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setScreen("login");
    } catch {
      Alert.alert("오류", "서버에 연결할 수 없습니다");
    }
  }

  // ── 로그아웃
  function logout() {
    setToken("");
    setLoggedUser("");
    setItems([]);
    setConfirmPassword("");
    setScreen("login");
  }

  // ── 식재료 조회
  async function loadItems() {
    try {
      const res = await fetch(`${API}/api/ingredients`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("오류", "서버에 연결할 수 없습니다");
    }
  }

  // ── 식재료 등록
  async function addItem() {
    if (!name) {
      Alert.alert("이름을 입력하세요");
      return;
    }
    if (!expiry) {
      Alert.alert("유통기한을 입력하세요 (예: 2026-06-02)");
      return;
    }

    try {
      const res = await fetch(`${API}/api/ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          quantity: parseInt(quantity, 10) || 1,
          expiry,
          category,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        Alert.alert("등록 실패", errData.error || "오류가 발생했습니다.");
        return;
      }

      resetForm();
      await loadItems();
    } catch (error) {
      console.error(error);
      Alert.alert("오류", "서버 전송 중 문제가 발생했습니다.");
    }
  }

  // ── 식재료 삭제
  async function deleteItem(id: number) {
    Alert.alert("삭제", "정말 삭제할까요?", [
      { text: "취소" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API}/api/ingredients/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          loadItems();
        },
      },
    ]);
  }

  // ── 수정 모드 진입
  function startEdit(item: any) {
    setEditingId(item.id);
    setName(item.name);
    setQuantity(String(item.quantity));
    setExpiry(item.expiry?.slice(0, 10));
    setCategory(item.category);
  }

  // ── 식재료 수정 완료
  async function updateItem() {
    if (!editingId) return;

    try {
      const res = await fetch(`${API}/api/ingredients/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          quantity: parseInt(quantity, 10) || 1,
          expiry,
          category,
        }),
      });

      if (!res.ok) {
        Alert.alert("수정 실패");
        return;
      }

      resetForm();
      loadItems();
    } catch {
      Alert.alert("오류", "수정 중 문제가 발생했습니다.");
    }
  }

  // ── 입력 폼 초기화 헬퍼
  function resetForm() {
    setEditingId(null);
    setName("");
    setQuantity("1");
    setExpiry("");
    setCategory("신선");
  }

  function getDiff(expiry: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  }
  function getStatus(diff: number) {
    if (diff < 0) return "urgent";
    if (diff <= 3) return "warning";
    return "ok";
  }
  function getLabel(diff: number) {
    if (diff < 0) return `⚠️ ${Math.abs(diff)}일 초과`;
    if (diff === 0) return "⚡ 오늘 만료";
    if (diff <= 3) return `🔔 ${diff}일 남음`;
    return `✅ ${diff}일 남음`;
  }

  const filtered =
    filter === "전체" ? items : items.filter((i: any) => i.category === filter);
  const expired = items.filter((i: any) => getDiff(i.expiry) < 0).length;
  const warn = items.filter((i: any) => {
    const d = getDiff(i.expiry);
    return d >= 0 && d <= 3;
  }).length;
  const CATS = ["신선", "냉동", "가공"];
  const FILTERS = ["전체", "신선", "냉동", "가공"];

  // ── 로그인 / 회원가입 화면
  if (screen === "login" || screen === "register") {
    const isLogin = screen === "login";
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#2a9d6e" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={s.authWrap}>
            <Text style={s.authLogo}>🧊</Text>
            <Text style={s.authTitle}>Fridge Master</Text>
            <Text style={s.authSub}>우리 집 냉장고 매니저</Text>

            <View style={s.authCard}>
              <Text style={s.authCardTitle}>
                {isLogin ? "로그인" : "회원가입"}
              </Text>
              <TextInput
                style={s.authInput}
                placeholder="아이디"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={s.authInput}
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {!isLogin && (
                <TextInput
                  style={s.authInput}
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              )}
              <TouchableOpacity
                style={s.authBtn}
                onPress={isLogin ? login : register}
              >
                <Text style={s.authBtnText}>
                  {isLogin ? "로그인" : "회원가입"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setScreen(isLogin ? "register" : "login");
                  setUsername("");
                  setPassword("");
                  setConfirmPassword("");
                }}
              >
                <Text style={s.authSwitch}>
                  {isLogin
                    ? "계정이 없으신가요? 회원가입"
                    : "이미 계정이 있으신가요? 로그인"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── 메인 화면
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#2a9d6e" />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>🧊 Fridge Master</Text>
          <Text style={s.headerSub}>안녕하세요, {loggedUser}님!</Text>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Text style={s.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={s.stats}>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: "#2a9d6e" }]}>{items.length}</Text>
          <Text style={s.statLabel}>전체</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: "#f5a623" }]}>{warn}</Text>
          <Text style={s.statLabel}>3일 내 만료</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: "#e05252" }]}>{expired}</Text>
          <Text style={s.statLabel}>기한 초과</Text>
        </View>
      </View>

      {/* ── 입력 / 수정 폼 영역 ── */}
      <View style={s.form}>
        <Text style={s.formTitle}>
          {editingId ? "✏️ 식재료 수정" : "➕ 식재료 등록"}
        </Text>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 2 }]}
            placeholder="이름"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[s.input, { flex: 1, marginLeft: 8 }]}
            placeholder="수량"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          style={s.input}
          placeholder="유통기한 (예: 2026-06-01)"
          value={expiry}
          onChangeText={setExpiry}
        />
        <View style={s.catRow}>
          {CATS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.catBtn, category === c && s.catBtnActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[s.catText, category === c && s.catTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 수정 모드 유무에 따른 하단 버튼 분기 */}
        {editingId ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={[s.addBtn, { flex: 1 }]}
              onPress={updateItem}
            >
              <Text style={s.addBtnText}>수정 완료</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.addBtn, { flex: 1, backgroundColor: "#999" }]}
              onPress={resetForm}
            >
              <Text style={s.addBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={addItem}>
            <Text style={s.addBtnText}>등록</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🥦</Text>
            <Text style={s.emptyText}>
              식재료가 없습니다{"\n"}위에서 등록해 보세요!
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          const diff = getDiff(item.expiry);
          const status = getStatus(diff);
          const label = getLabel(diff);
          const borderColor =
            status === "urgent"
              ? "#e05252"
              : status === "warning"
                ? "#f5a623"
                : "#2a9d6e";
          const chipBg =
            status === "urgent"
              ? "#fdeaea"
              : status === "warning"
                ? "#fff4e0"
                : "#e8f7f1";
          const chipColor =
            status === "urgent"
              ? "#e05252"
              : status === "warning"
                ? "#f5a623"
                : "#2a9d6e";

          const isCurrentlyEditing = editingId === item.id;

          return (
            <View
              style={[
                s.card,
                { borderLeftColor: borderColor },
                isCurrentlyEditing && s.cardEditing,
              ]}
            >
              <View
                style={[
                  s.badge,
                  item.category === "냉동"
                    ? s.badgeFrozen
                    : item.category === "가공"
                      ? s.badgeProc
                      : s.badgeFresh,
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    item.category === "냉동"
                      ? { color: "#4a90d9" }
                      : item.category === "가공"
                        ? { color: "#9b59b6" }
                        : { color: "#2a9d6e" },
                  ]}
                >
                  {item.category}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardMeta}>
                  수량: {item.quantity}개 · {item.expiry?.slice(0, 10)}
                </Text>
              </View>
              <View style={[s.chip, { backgroundColor: chipBg }]}>
                <Text style={[s.chipText, { color: chipColor }]}>{label}</Text>
              </View>

              {/* 수정 버튼 추가 */}
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => startEdit(item)}
              >
                <Text style={s.editText}>✏️</Text>
              </TouchableOpacity>

              {/* 삭제 버튼 한 개로 통합 */}
              <TouchableOpacity
                style={s.delBtn}
                onPress={() => deleteItem(item.id)}
              >
                <Text style={s.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f0f7f4" },
  header: {
    backgroundColor: "#2a9d6e",
    padding: 20,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: { color: "#fff", fontSize: 13 },
  authWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f0f7f4",
  },
  authLogo: { fontSize: 60, marginBottom: 8 },
  authTitle: { fontSize: 28, fontWeight: "800", color: "#2a9d6e" },
  authSub: { fontSize: 14, color: "#7a9e8e", marginBottom: 32 },
  authCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  authCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a2e25",
    marginBottom: 20,
  },
  authInput: {
    borderWidth: 1.5,
    borderColor: "#d4eae0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f0f7f4",
    marginBottom: 12,
  },
  authBtn: {
    backgroundColor: "#2a9d6e",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  authBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  authSwitch: {
    color: "#2a9d6e",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  stats: { flexDirection: "row", margin: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statNum: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#7a9e8e", marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    color: "#2a9d6e",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 12,
  },
  row: { flexDirection: "row", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d4eae0",
    borderRadius: 9,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f0f7f4",
    marginBottom: 8,
  },
  catRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  catBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#d4eae0",
    alignItems: "center",
  },
  catBtnActive: { backgroundColor: "#2a9d6e", borderColor: "#2a9d6e" },
  catText: { color: "#7a9e8e", fontSize: 13, fontWeight: "600" },
  catTextActive: { color: "#fff" },
  addBtn: {
    backgroundColor: "#2a9d6e",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#d4eae0",
    backgroundColor: "#fff",
  },
  filterBtnActive: { backgroundColor: "#2a9d6e", borderColor: "#2a9d6e" },
  filterText: { color: "#7a9e8e", fontSize: 13 },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardEditing: {
    borderColor: "#2a9d6e",
    borderWidth: 1,
    backgroundColor: "#f5fdfa",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeFresh: { backgroundColor: "#e8f7f1" },
  badgeFrozen: { backgroundColor: "#e8f2fb" },
  badgeProc: { backgroundColor: "#f4eefb" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardName: { fontWeight: "700", fontSize: 15 },
  cardMeta: { color: "#7a9e8e", fontSize: 12, marginTop: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  chipText: { fontSize: 11, fontWeight: "700" },
  editBtn: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  editText: { fontSize: 12 },
  delBtn: {
    marginLeft: 6,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  delText: { color: "#ccc", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#7a9e8e", textAlign: "center", fontSize: 14 },
});
