export function createId(): string {
  const time = Date.now().toString(16).padStart(12, "0");
  const random = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${time.slice(0, 8)}-${time.slice(8)}-4${random.slice(0, 3)}-${((8 + Math.floor(Math.random() * 4)).toString(16))}${random.slice(3, 6)}-${random.slice(6, 18)}`;
}
