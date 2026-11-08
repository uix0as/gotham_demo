import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
export default function NotFound() {
    return <AuthLayout title="페이지를 찾을 수 없습니다" subtitle="요청한 주소가 존재하지 않거나 이동되었습니다." icon={<Compass size={22} strokeWidth={1.6}/>}><div className="not-found-content"><span>404</span><div><Link to="/" className="app-button is-primary"><ArrowLeft size={15}/>통합 대시보드로</Link><Link to="/events/" className="app-button">상황정보 보기</Link></div></div></AuthLayout>;
}
