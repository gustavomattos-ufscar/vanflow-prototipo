import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { OperatorProvider } from './lib/context.tsx';
import { Landing } from './landing/Landing.tsx';
import { Entrar } from './pages/Entrar.tsx';
import { WhatsAppPage } from './pages/WhatsApp.tsx';
import { Motorista } from './pages/Motorista.tsx';
import { AlunoPage, ReciboPage } from './pages/Aluno.tsx';
import { DemoPage } from './pages/Demo.tsx';
import { PalcoPage } from './pages/Palco.tsx';
import { StartupPage } from './pages/Startup.tsx';
import { PanelLayout } from './pages/panel/PanelLayout.tsx';
import { Hoje } from './pages/panel/Hoje.tsx';
import { Alunos, FichaAluno } from './pages/panel/Alunos.tsx';
import { Grade } from './pages/panel/Grade.tsx';
import { Cobrancas } from './pages/panel/Cobrancas.tsx';
import { Avulsas } from './pages/panel/Avulsas.tsx';
import { Rota } from './pages/panel/Rota.tsx';
import { Documentos } from './pages/panel/Documentos.tsx';
import { Financeiro } from './pages/panel/Financeiro.tsx';
import { Mensagens } from './pages/panel/Mensagens.tsx';
import { Configuracoes } from './pages/panel/Configuracoes.tsx';
import { Assinatura } from './pages/panel/Assinatura.tsx';
import { Comecar } from './pages/panel/Comecar.tsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

export function App() {
  return (
    <OperatorProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/painel" element={<PanelLayout />}>
          <Route index element={<Hoje />} />
          <Route path="alunos" element={<Alunos />} />
          <Route path="alunos/:id" element={<FichaAluno />} />
          <Route path="grade" element={<Grade />} />
          <Route path="cobrancas" element={<Cobrancas />} />
          <Route path="avulsas" element={<Avulsas />} />
          <Route path="rota" element={<Rota />} />
          <Route path="rota/:tripId" element={<Rota />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="mensagens" element={<Mensagens />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="assinatura" element={<Assinatura />} />
          <Route path="comecar" element={<Comecar />} />
        </Route>
        <Route path="/motorista" element={<Motorista />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/a/:token" element={<AlunoPage />} />
        <Route path="/a/:token/recibo/:paymentId" element={<ReciboPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/demo/palco" element={<PalcoPage />} />
        <Route path="/startup" element={<StartupPage />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </OperatorProvider>
  );
}
