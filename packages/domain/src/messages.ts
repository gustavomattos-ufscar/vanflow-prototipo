/** Modelos de mensagem da docs/08, seção 5. Sem travessão, curtos, no tom da landing. */
import { brl, firstName, fmtDayMonth, fmtHour, monthName, WEEKDAY_LONG, WEEKDAY_SHORT } from './format.ts';
import { weekdayOf } from './time.ts';

const dayShort = (date: string) => WEEKDAY_SHORT[weekdayOf(date)];

/** "na quinta (12/11)", "no sábado (14/11)". */
export function onDay(date: string): string {
  const weekday = weekdayOf(date);
  return `${weekday === 0 || weekday === 6 ? 'no' : 'na'} ${WEEKDAY_LONG[weekday]} (${fmtDayMonth(date)})`;
}

/** Quando a falta vale: "na quinta (12/11)", "hoje (11/11)" ou "na volta de hoje (11/11)". */
export function absenceWhen(date: string, today: string, directions: string[]): string {
  if (date !== today) return onDay(date);
  const day = `hoje (${fmtDayMonth(date)})`;
  return directions.length === 1 ? `na ${directions[0]} de ${day}` : day;
}

/** Botões de quando a VanFlow não entende e não há pergunta de presença em aberto. */
export const MENU_BUTTONS = ['Vaga avulsa', '2ª via do Pix'];
export const PRESENCE_BUTTONS = ['Vou', 'Não vou'];

export const msg = {
  confirmation: (name: string, date: string, start: string, faculty: string) =>
    `Oi, ${firstName(name)}! Amanhã (${dayShort(date)}) você tem aula às ${fmtHour(start)} na ${faculty}. Vai na van?`,
  going: (departure: string, pickup: string) => `Combinado! Saída às ${fmtHour(departure)} no ${pickup}. Até amanhã.`,
  notGoing: (nextDate: string | null) =>
    `Anotado! Seu lugar foi liberado. Até ${nextDate ? WEEKDAY_LONG[weekdayOf(nextDate)] : 'a próxima'}.`,
  reasonNoted: () => 'Obrigado por avisar. O motivo ficou anotado para o motorista.',
  onlyOneWay: (direction: 'ida' | 'volta') =>
    direction === 'ida' ? 'Combinado! Você vai só na ida. Liberamos seu lugar na volta.' : 'Combinado! Você vai só na volta. Liberamos seu lugar na ida.',
  reminder: (name: string, deadline: string) =>
    `${firstName(name)}, ainda não sabemos se você vai amanhã. Responda VOU ou NÃO VOU até ${deadline}.`,
  offer: (date: string, lineName: string, departure: string, price: number) =>
    `Abriu vaga na van de ${dayShort(date)} (${fmtDayMonth(date)}): ${lineName}, saída ${fmtHour(departure)}. Ida e volta por ${brl(price)}. Quer reservar?`,
  availability: (date: string, lineName: string, departure: string, seats: number, price: number) => {
    const longDay = WEEKDAY_LONG[weekdayOf(date)];
    return `${longDay[0].toUpperCase()}${longDay.slice(1)}, ${fmtDayMonth(date)}: ${lineName}, saída ${fmtHour(departure)}, ${seats} ${seats === 1 ? 'vaga' : 'vagas'}. Ida e volta ${brl(price)}. Quer reservar?`;
  },
  noAvailability: () => 'Não temos vaga livre nesse dia. Assim que abrir, avisamos por aqui.',
  alreadyOnList: (date: string) => `Você já está na lista de ${dayShort(date)} (${fmtDayMonth(date)}).`,
  reserved: (minutes: number) => `Vaga reservada por ${minutes} minutos. Pague com o Pix copia e cola abaixo para garantir:`,
  reservationExpired: () => 'Sua reserva expirou e a vaga voltou para a lista. Se ainda quiser ir, é só pedir de novo.',
  seatTaken: () => 'Essa vaga acabou de ser preenchida. Se abrir outra, avisamos por aqui.',
  avulsaPaid: (date: string, departure: string, pickup: string) =>
    `Pagamento recebido! Você está na lista de ${dayShort(date)}. Saída às ${fmtHour(departure)} no ${pickup}.`,
  invoice: (name: string, month: string, vanName: string, amount: number, dueDate: string) =>
    `Oi, ${firstName(name)}! Sua mensalidade de ${monthName(month)} da ${vanName} é ${brl(amount)}, com vencimento em ${fmtDayMonth(dueDate)}. Pix copia e cola:`,
  invoiceBefore: (amount: number, when: string) => `Lembrete: sua mensalidade de ${brl(amount)} vence ${when}. O Pix está aqui:`,
  invoiceLate: (name: string, month: string, dueDate: string) =>
    `${firstName(name)}, a mensalidade de ${monthName(month)} venceu em ${fmtDayMonth(dueDate)}. Se já pagou, desconsidere. Pix:`,
  pixAgain: (amount: number, description: string) => `Aqui está o Pix de ${brl(amount)}, referente a ${description}:`,
  noOpenInvoice: () => 'Você não tem nenhuma cobrança em aberto. Tudo certo por aqui!',
  receipt: (amount: number, description: string, link: string) => `Recebemos ${brl(amount)} referente a ${description}. Obrigado! Recibo: ${link}`,
  notUnderstood: () => 'Não entendi. Toque em uma opção:',
  menu: () => 'Não entendi. Toque no que você precisa:',
  vanFull: () => 'Seu lugar já foi vendido e a van está cheia para esse dia. Se abrir vaga, avisamos por aqui.',
  noPendingTrip: () => 'Você não tem viagem aguardando resposta agora. A próxima confirmação chega na véspera, às 21h. Se precisar de outra coisa, toque em uma opção:',
  gradeRequest: (name: string, link: string) =>
    `Oi, ${firstName(name)}! Para a VanFlow saber em que dias você vai na van, preencha sua grade de aulas deste semestre neste link: ${link}`,
  gradeReceived: (days: string) =>
    days ? `Recebemos sua grade (${days}). Obrigado! A confirmação chega na véspera de cada aula.` : 'Recebemos sua grade. Obrigado!',
  planPaused: (until: string | null) => until
    ? `Seu plano foi pausado e volta ${onDay(until)}. Até lá você não recebe confirmações nem cobranças.`
    : 'Seu plano foi pausado. Você não recebe confirmações nem cobranças até ele voltar.',
  planResumed: () => 'Seu plano voltou! A confirmação chega de novo na véspera de cada aula.',
  absenceMarked: (when: string) => `Anotamos que você não vai ${when}. Seu lugar foi liberado.`,
  alertGradeUpdated: (name: string, note?: string) => `${firstName(name)} preencheu a grade pelo link.${note ? ` ${note}` : ''}`,
  alertPlanResumed: (name: string) => `O plano de ${firstName(name)} voltou hoje.`,
  alertLateAbsence: (name: string, whenLabel: string) => `${firstName(name)} avisou que não vai ${whenLabel}.`,
  alertLateInvoices: (count: number) => `${count} ${count === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}.`,
};
