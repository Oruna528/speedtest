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

  // 3. 識別情報の抽出とPing応答
  if (url.pathname === '/api/empty') {
    const cf = (context.request as any).cf || {};
    
    // ① グローバルIPアドレスを取得
    const clientIp = context.request.headers.get('cf-connecting-ip') || 'Unknown IP';
    
    // ② IPv4かIPv6かを自動識別
    const ipVersion = clientIp.includes(':') ? 'IPv6' : 'IPv4';
    
    // ③ 接続ネットワーク（プロバイダ/回線組織名）とASN番号
    const ispName = cf.asOrganization || 'Unknown ISP';
    const asn = cf.asn ? `AS${cf.asn}` : '';
    const fullIsp = asn ? `${ispName} (${asn})` : ispName;

    // ④ 測定サーバーの位置 (Cloudflare最寄りデータセンターの空港3文字コード。例: NRT=東京成田, KIX=大阪関西)
    const serverLocation = cf.colo || 'Cloudflare Edge';

    const netInfo = {
      ip: clientIp,
      version: ipVersion,
      isp: fullIsp,
      server: serverLocation
    };

    return new Response(JSON.stringify(netInfo), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' 
      },
    });
  }

  return new Response(null, { status: 404 });
};
