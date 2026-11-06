<?php
declare(strict_types=1);
// PHP 8+, HTTPS and configured host mail transport. No credentials in the repository.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax', 'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
function respond(int $status, array $body): void { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $_SESSION['request_token'] ??= bin2hex(random_bytes(32));
    respond(200, ['token' => $_SESSION['request_token']]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['message' => 'Метод не поддерживается.']);
$raw = file_get_contents('php://input', false, null, 0, 32769);
if (strlen($raw) > 32768) respond(413, ['message' => 'Заявка слишком большая.']);
$data = json_decode($raw, true);
if (!is_array($data)) respond(400, ['message' => 'Некорректная заявка.']);
if (!is_string($data['token'] ?? null) || !hash_equals($_SESSION['request_token'] ?? '', $data['token']) || empty($_SESSION['request_token'])) respond(403, ['message' => 'Обновите страницу и повторите отправку.']);
function field(array $data, string $key, int $max): string {
    $v = $data[$key] ?? '';
    if (!is_string($v) || strlen($v) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $v)) respond(422, ['message' => 'Проверьте заполненные поля.']);
    return trim($v);
}
$id = field($data, 'requestId', 80);
if (!preg_match('/^[a-f0-9-]{36}$/i', $id)) respond(422, ['message' => 'Обновите страницу.']);
if (isset($_SESSION['sent_requests'][$id])) respond(200, ['ok' => true]);
if (field($data, 'website', 300) !== '') respond(422, ['message' => 'Не удалось отправить заявку.']);
if (($data['consent'] ?? false) !== true) respond(422, ['message' => 'Подтвердите согласие на обработку данных.']);
$name = field($data, 'name', 300);
$phone = field($data, 'phone', 100);
$comment = field($data, 'comment', 6000);
if ($name === '' || !preg_match('/^[0-9+()\s-]+$/', $phone) || !preg_match('/^\d{10,15}$/', preg_replace('/\D/', '', $phone))) respond(422, ['message' => 'Укажите имя и корректный телефон.']);
$lines = ['Заявка с сайта Мануфактура', 'Номер: '.$id, 'Имя: '.$name, 'Телефон: '.$phone];
$s = $data['selection'] ?? null;
$catalogProduct = $data['catalogProduct'] ?? null;
if ($catalogProduct !== null) {
    $catalogProducts = [
        'texas' => 'Забор «Техас»',
        'tokyo' => 'Забор «Токио»',
        'roof-parapet' => 'Парапет плоской кровли',
    ];
    if ($s !== null || !is_string($catalogProduct) || !isset($catalogProducts[$catalogProduct])) {
        respond(422, ['message' => 'Выберите изделие.']);
    }
    $lines[] = 'Изделие: '.$catalogProducts[$catalogProduct];
}
if ($s !== null) {
    $models = ['flat60'=>'ФЛЭТ 60','flat80'=>'ФЛЭТ 80','modern'=>'МОДЕРН','classic'=>'КЛАССИК МОДЕРН'];
    if (!is_array($s) || !is_string($s['product'] ?? null) || !isset($models[$s['product']])) respond(422, ['message'=>'Выберите модель изделия.']);
    $items = $s['items'] ?? [];
    if (!is_array($items) || count($items)<1 || count($items)>20 || array_keys($items)!==range(0,count($items)-1)) respond(422,['message'=>'Проверьте список размеров.']);
    $lines[] = 'Изделие: '.$models[$s['product']]; $total=0;
    foreach ($items as $i=>$item) {
        if (!is_array($item)) respond(422,['message'=>'Проверьте размеры.']);
        foreach (['length'=>[100,3000],'width'=>[100,3000],'quantity'=>[1,999]] as $key=>$range) {
            if (!is_int($item[$key] ?? null) || $item[$key]<$range[0] || $item[$key]>$range[1]) respond(422,['message'=>'Проверьте размеры и количество.']);
        }
        $lines[] = ($i+1).'. '.$item['length'].' × '.$item['width'].' мм, '.$item['quantity'].' шт.'; $total += $item['quantity'];
    }
    $color=field($s,'color',400); $finish=field($s,'finish',100);
    if ($color==='' || !in_array($finish,['Матовое','Глянцевое'],true)) respond(422,['message'=>'Укажите цвет и покрытие.']);
    $mesh=($s['mesh'] ?? false) === true && in_array($s['product'],['modern','classic'],true);
    $lines[]='Всего: '.$total.' шт.'; $lines[]='Цвет: '.$color; $lines[]='Покрытие: '.$finish; $lines[]='Защитная сетка: '.($mesh?'да':'нет');
}
$lines[]='Комментарий: '.$comment;
if (time()-($_SESSION['last_attempt'] ?? 0)<30) respond(429,['message'=>'Подождите 30 секунд перед повторной отправкой.']);
// Configure an address on the website domain through the hosting environment.
$from=getenv('MANUFACTURA_MAIL_FROM') ?: '';
if (!filter_var($from,FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/',$from)) respond(503,['message'=>'Отправка временно недоступна. Свяжитесь с менеджером.']);
$_SESSION['last_attempt']=time();
$subject='=?UTF-8?B?'.base64_encode('Заявка на расчёт · Мануфактура').'?=';
$sent=mail('manufactura_tm@mail.ru',$subject,implode("\r\n",$lines),['From'=>$from,'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8']);
if (!$sent) respond(503,['message'=>'Не удалось отправить заявку. Попробуйте позже или позвоните нам.']);
$_SESSION['sent_requests'][$id]=time();
$_SESSION['sent_requests']=array_slice($_SESSION['sent_requests'],-20,null,true);
respond(200,['ok'=>true]);
