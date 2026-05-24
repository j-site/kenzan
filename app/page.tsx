"use client";
import dynamic from "next/dynamic";
const KenzanApp = dynamic(() => import("../components/KenzanApp"), { ssr: false });
export default function Page() { return <KenzanApp />; }
