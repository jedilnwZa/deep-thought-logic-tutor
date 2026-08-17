interface Props {
  message: string;
}

export default function MessageBox({ message }: Props) {
  return (
    <div className="message-box">
      <div className="message-box__label">Message Box</div>
      <div className="message-box__content">{message}</div>
    </div>
  );
}
