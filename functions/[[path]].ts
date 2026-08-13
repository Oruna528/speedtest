export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // CORS（クロスドメイン制限）対策の共通ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // プリフライト（OPTIONS）リクエストへの応答
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 1. ダウンロードテスト (メモリ消費ゼロの超高速ストリーム生成)
  if (url.pathname === '/api/download') {
    const sizeStr = url.searchParams.get('size') || '8388608'; // デフォルト8MB
    let size = parseInt(sizeStr, 10);
    if (isNaN(size) || size <= 0) size = 8388608;

    // 1回の書き込みサイズ（64KB）
    const chunkSize = 64 * 1024;
    const chunk = new Uint8Array(chunkSize);
    let bytesSent = 0;

    // メモリを圧迫させずに巨大なダミーデータをループ生成するストリーム
    const stream = new ReadableStream({
      pull(controller) {
        if (bytesSent >= size) {
          controller.close();
          return;
        }
        const remaining = size - bytesSent;
        if (remaining < chunkSize) {
          controller.enqueue(chunk.subarray(0, remaining));
          bytesSent += remaining;
        } else {
          controller.enqueue(chunk);
          bytesSent += chunkSize;
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Length': size.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  }

  // 2. アップロードテスト (ブラウザからのテストパケットをメモリ内で受け流して破棄)
  if (url.pathname === '/api/upload') {
    if (context.request.method === 'POST') {
      try {
        // メモリバーストを防ぐため、arrayBufferではなくボディをそのまま読み飛ばす
        if (context.request.body) {
          await context.request.body.cancel();
        }
        return new Response('OK', { status: 200, headers: corsHeaders });
      } catch {
        return new Response('Upload Failed', { status: 500, headers: corsHeaders });
      }
    }
  }

  // 3. 識別情報の抽出とPing応答 (ネットワーク情報の自動解析)
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

    // ④ 測定サーバーの位置 (Cloudflare最寄りデータセンターの空港3文字コード)
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
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' 
      },
    });
  }

  // どのAPIパスにも一致しない場合は正常なNot Foundを返す
  return new Response('Not Found', { 
    status: 404, 
    headers: { 'Content-Type': 'text/plain', ...corsHeaders } 
  });
};
