// Icono de los botones verdes de contacto. En celular el botón abre WhatsApp: burbuja de chat. En computadora
// abre el formulario corto (ui/LeadDialog.jsx): avión de papel, el mismo de «Enviar mi pedido», para que el
// botón que abre el formulario y el que lo envía se reconozcan como un solo camino. Antes la burbuja prometía
// WhatsApp también donde el clic abría un formulario (segunda ronda de la auditoría, noviembre de 2026).
import { MessageCircle, Send } from 'lucide-react';
import { ByPointer } from './pointer';

export default function ContactIcon({ size = 18 }) {
  return <ByPointer fine={<Send size={size} aria-hidden="true" />} coarse={<MessageCircle size={size} aria-hidden="true" />} />;
}
