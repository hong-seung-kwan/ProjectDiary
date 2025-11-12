import React, { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebase/firebase';
import { FirebaseError } from 'firebase/app';
console.log("Auth 객체 확인:", auth);
const AuthPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                alert("로그인성공");
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                alert("회원가입 성공")
            }
            setEmail("");
            setPassword("");
        } catch (error) {
            if (error instanceof FirebaseError) {
                alert(`오류 발생: ${error.code} - ${error.message}`);
            } else {
                console.error("예상치 못한 오류:", error);
            }
        }
    }

    return (
        <div className='flex items-center justify-center h-screen bg-gray-100'>
            <div className='bg-white p-8 rounded-2xl shadow-md w-80'>
                <h2 className='text-xl font-semibold mb-4 text-center'>
                    {isLogin ? "로그인" : "회원가입"}
                </h2>
                <form onSubmit={handleSubmit} className='space-y-3'>
                    <input
                        type='email'
                        placeholder='이메일'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='w-full border px-3 py-2 rounded-md'
                        required
                    />
                    <input
                        type='password'
                        placeholder='비밀번호'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='w-full border px-3 py-2 rounded-md'
                        required
                    />
                    <button
                        type='submit'
                        className='w-full bg-blue-500 text-white py-2 rounded-md'
                    >
                        {isLogin ? "로그인" : "회원가입"}
                    </button>
                </form>

                <p
                    className='text-sm text-center mt-3 text-blue-600 cursor-pointer'
                    onClick={() => setIsLogin(!isLogin)}
                >
                    {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
                </p>
            </div>
        </div>
    )
}

export default AuthPage