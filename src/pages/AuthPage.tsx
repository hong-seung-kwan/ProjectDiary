import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from '../firebase/firebase';
import { FirebaseError } from 'firebase/app';
import Toast from '../components/Toast';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "" }>({
    message: "",
    type: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("로그인 성공!", "success");
        navigate("/");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("회원가입 성공! 로그인 화면으로 이동합니다.", "success");

        await signOut(auth);

        setTimeout(() => {
            setIsLogin(true);
        }, 800);

        setEmail("");
        setPassword("");
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (isLogin) {
          switch (error.code) {
            case "auth/invalid-credential":
              showToast("아이디 또는 비밀번호를 다시 확인해주세요.", "error");
              break;
            case "auth/invalid-email":
              showToast("이메일 형식이 올바르지 않습니다.", "error");
              break;
            default:
              showToast("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
          }
        } else {
          switch (error.code) {
            case "auth/email-already-in-use":
              showToast("이미 사용 중인 이메일입니다.", "error");
              break;
            case "auth/invalid-email":
              showToast("이메일 형식이 올바르지 않습니다.", "error");
              break;
            case "auth/weak-password":
              showToast("비밀번호는 6자 이상이어야 합니다.", "error");
              break;
            default:
              showToast("회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
          }
        }
      } else {
        console.error("예상치 못한 오류:", error);
        showToast("시스템 오류가 발생했습니다.", "error");
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-10 rounded-2xl shadow-md w-[55vh] h-[55vh] flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "로그인" : "회원가입"}
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {isLogin ? "계정으로 로그인하세요" : "새 계정을 생성하세요"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">이메일</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            {isLogin ? "로그인" : "회원가입"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-4 text-blue-600 cursor-pointer hover:underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </p>
      </div>

      {/* ✅ Toast 알림 */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type as "success" | "error" | "info"}
          onClose={() => setToast({ message: "", type: "" })}
        />
      )}
    </div>
  );
};

export default AuthPage;
