export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // 1. ダウンロードテスト (ダミーデータを生成してブラウザへ送信)
  if (url.pathname === '/api/download') {
    const size = parseInt(url.searchParams.get('size') || '8388608'); // デフォルト8MB
    return new Response(new Uint8Array(size), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  }

  // 2. アップロードテスト (ブラウザからのテストパケットをメモリ内で受け流して破棄)
  if (url.pathname === '/api/upload') {
    if (context.request.method === 'POST') {
      await context.request.arrayBuffer();
      return new Response('OK', { status: 200 });
    }
  }
};
