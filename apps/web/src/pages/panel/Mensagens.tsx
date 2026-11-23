import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtClock, fmtWeekdayDate } from '@vanflow/domain';
import { Empty, ErrorNote, Loading, PageHead } from '../../components/ui.tsx';
import { useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const KINDS: Array<[string, string]> = [
  ['', 'Todas'], ['confirmacao', 'Confirmações'], ['texto', 'Respostas'], ['lembrete', 'Lembretes'], ['cobranca', 'Cobranças'],
  ['pix', 'Pix'], ['oferta_avulsa', 'Ofertas'], ['recibo', 'Recibos'],
];

export function Mensagens() {
  const { operatorId } = useOperator();
  const [kind, setKind] = useState('');
  const { data, error } = useLive<any[]>(`/operators/${operatorId}/messages${kind ? `?kind=${kind}` : ''}`);
  return (
    <>
      <PageHead eyebrow="Mensagens" title="Tudo que a VanFlow conversou">
        Você não precisa ler isto. Fica aqui caso queira conferir alguma conversa.
      </PageHead>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Filtrar por tipo" style={{ flexWrap: 'wrap' }}>
          {KINDS.map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}>{label}</button>)}
        </div>
      </div>
      {error && <ErrorNote text={error} />}
      {!data ? <Loading /> : data.length === 0 ? <div className="card"><Empty title="Nenhuma mensagem deste tipo ainda." /></div> : (
        <div className="card flat table-wrap">
          <table className="data cards">
            <thead><tr><th>Quando</th><th>Aluno</th><th>De</th><th>Mensagem</th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td data-label="Quando" className="mono small nowrap">{fmtWeekdayDate(m.created_at)} {fmtClock(m.created_at)}</td>
                  <td data-label="Aluno" className="nowrap"><Link to={`/painel/alunos/${m.student_id}`}>{m.name}</Link></td>
                  <td data-label="De" className="small">{m.direction === 'in' ? 'Aluno' : 'VanFlow'}</td>
                  <td data-label="Mensagem" className="small span">{m.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
