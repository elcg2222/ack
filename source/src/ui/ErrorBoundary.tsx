import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode;fallback?:ReactNode},{error:Error|null}>{
 state={error:null as Error|null};
 static getDerivedStateFromError(error:Error){return {error};}
 render(){if(this.state.error)return this.props.fallback??<div className="error-fallback"><h3>Không thể khởi tạo khung nhìn</h3><p>{this.state.error.message}</p><button className="btn primary" onClick={()=>this.setState({error:null})}>Thử lại</button></div>;return this.props.children;}
}
