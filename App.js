import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://172.30.13";

export default function App() {
  // 인증 및 유저 상태
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("shdudwo"); // 로그인 레이블용
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 임시 로그인용 입력 필드 (테스트 편의를 위해 기본값 세팅)
  const [loginId, setLoginId] = useState("shdudwo");
  const [loginPw, setLoginPw] = useState("password123");

  // 식재료 입력 필드 상태
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expiry, setExpiry] = useState("2026-06-30"); // YYYY-MM-DD 형식
  const [category, setCategory] = useState("선선"); // 신선, 냉동, 가공 등

  // 식재료 목록 상태
  const [ingredients, setIngredients] = useState([]);

  // 1. 임시 로그인 처리 함수 (토큰 발급받기)
  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginId, password: loginPw }),
      });
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUsername(data.username);
        setIsLoggedIn(true);
        Alert.alert("성공", "로그인 되었습니다. 토큰이 확보되었습니다.");
      } else {
        Alert.alert(
          "로그인 실패",
          data.error || "인증 정보가 올바르지 않습니다.",
        );
      }
    } catch (error) {
      Alert.alert("에러", "서버와 통신할 수 없습니다. IP 주소를 확인하세요.");
      console.error(error);
    }
  };

  // 2. 전체 식재료 조회 함수 (GET)
  const fetchIngredients = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/ingredients`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // 👈 백엔드 verifyToken 미들웨어 통과용
        },
      });
      const data = await response.json();
      if (response.ok) {
        setIngredients(data);
      } else {
        console.error("조회 실패:", data.error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 로그인 상태가 되면 자동으로 데이터를 불러옵니다.
  useEffect(() => {
    if (isLoggedIn) {
      fetchIngredients();
    }
  }, [isLoggedIn]);

  // 3. 식재료 등록 함수 (POST)
  const handleAddIngredient = async () => {
    if (!name || !expiry) {
      Alert.alert("경고", "이름과 유통기한은 필수입니다.");
      return;
    }

    if (!token) {
      Alert.alert("인증 오류", "로그인 토큰이 없습니다. 먼저 로그인하세요.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 👈 토큰을 헤더에 반드시 포함
        },
        body: JSON.stringify({
          name: name,
          quantity: parseInt(quantity) || 1, // 숫자로 변환
          expiry: expiry, // 'YYYY-MM-DD'
          category: category, // '선선', '냉동', '가공' 등
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("성공", "식재료가 등록되었습니다.");
        setName(""); // 입력 필드 초기화
        fetchIngredients(); // 등록 후 목록 새로고침
      } else {
        Alert.alert("등록 실패", data.error || "오류가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("에러", "데이터 전송 중 오류가 발생했습니다.");
      console.error(error);
    }
  };

  // 로그인하지 않았을 때 보여주는 화면
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginBox}>
          <Text style={styles.title}>Fridge Master 로그인</Text>
          <TextInput
            style={styles.input}
            placeholder="아이디"
            value={loginId}
            onChangeText={setLoginId}
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            secureTextEntry
            value={loginPw}
            onChangeText={setLoginPw}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>테스트 계정 로그인</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 로그인 완료 후 식재료 등록/조회 화면
  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 유저 정보 바 */}
      <View style={styles.header}>
        <Text style={styles.userText}>안녕하세요, {username}님!</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setIsLoggedIn(false)}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 식재료 입력 폼 */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>+ 식재료 등록</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2, marginBottom: 0 }]}
            placeholder="이름"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 8 }]}
            placeholder="수량"
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="유통기한 (YYYY-MM-DD)"
          value={expiry}
          onChangeText={setExpiry}
        />

        {/* 카테고리 선택 탭 기능 대체 (기본값 버튼화 가능) */}
        <View style={styles.categoryRow}>
          {["선선", "냉동", "가공"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, category === cat && styles.catBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.catBtnText,
                  category === cat && styles.catBtnTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#2ecc71" }]}
          onPress={handleAddIngredient}
        >
          <Text style={styles.buttonText}>등 록</Text>
        </TouchableOpacity>
      </View>

      {/* 식재료 리스트 출력 */}
      <Text style={styles.listTitle}>
        내 냉장고 목록 ({ingredients.length})
      </Text>
      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View>
              <Text style={styles.itemName}>
                {item.name} ({item.quantity}개)
              </Text>
              <Text style={styles.itemExpiry}>
                유통기한: {item.expiry ? item.expiry.split("T")[0] : ""}
              </Text>
            </View>
            <Text style={styles.itemCategory}>{item.category}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            식재료가 없습니다. 위에서 등록해 보세요!
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa", padding: 16 },
  loginBox: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#34495e",
    borderRadius: 8,
    marginBottom: 16,
  },
  userText: { color: "#fff", fontWeight: "bold" },
  logoutBtn: { backgroundColor: "#e74c3c", padding: 6, borderRadius: 4 },
  formCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
  },
  row: { flexDirection: "row", marginBottom: 10 },
  input: {
    backgroundColor: "#f1f2f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#dcdde1",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  catBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f1f2f6",
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  catBtnActive: { backgroundColor: "#3498db" },
  catBtnText: { color: "#7f8c8d", fontWeight: "bold" },
  catBtnTextActive: { color: "#fff" },
  button: {
    backgroundColor: "#3498db",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#2c3e50",
  },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f2f6",
  },
  itemName: { fontSize: 16, fontWeight: "bold", color: "#2c3e50" },
  itemExpiry: { fontSize: 12, color: "#7f8c8d", marginTop: 4 },
  itemCategory: {
    backgroundColor: "#e1b12c",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    overflow: "hidden",
  },
  emptyText: { textAlign: "center", color: "#95a5a6", marginTop: 40 },
});
