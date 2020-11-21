export function generateHttpHead(statusCode: number, statusMessage: string, end = true) {
  return `HTTP/1.1 ${statusCode} ${statusMessage}\n${end ? '\n' : ''}`;
}

export function parseBasicAuthenticationHeader(data: string) {
  // @todo maybe add checks ?
  const payload = data.replace('Basic ', '');
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  return { username, password };
}