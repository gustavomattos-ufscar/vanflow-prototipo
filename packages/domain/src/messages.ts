/** Modelos de mensagem da docs/08, seção 5. Sem travessão, curtos, no tom da landing. */
import { brl, firstName, fmtDayMonth, fmtHour, monthName, WEEKDAY_LONG, WEEKDAY_SHORT } from './format.ts';
import { weekdayOf } from './time.ts';

const dayShort = (date: string) => WEEKDAY_SHORT[weekdayOf(date)];

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
  notUnderstood: () => 'Não entendi. Toque em uma opção ou responda VOU ou NÃO VOU.',
  menu: () => 'Não entendi. Você pode pedir "vaga avulsa" ou "2ª via do Pix".',
  vanFull: () => 'Seu lugar já foi vendido e a van está cheia para esse dia. Se abrir vaga, avisamos por aqui.',
  noPendingTrip: () => 'Você não tem viagem aguardando resposta agora. A próxima confirmação chega na véspera, às 21h.',
  alertLateAbsence: (name: string, whenLabel: string) => `${firstName(name)} avisou que não vai ${whenLabel}.`,
  alertLateInvoices: (count: number) => `${count} ${count === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}.`,
};
