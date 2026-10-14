やっぱり猫が好き 非公式ファンサイト Ver.2
Googleスプレッドシート連携版

■ 追加された仕組み
・episodes シート → episodes.html に自動表示
・stories シート → fanfiction.html に自動表示
・stories の本文 → story.html?id=作品ID に自動表示
・公開/下書き切替
・エピソードのタグを自動生成し、絞り込み可能
・作品の前話/次話リンクを自動生成
・スプレッドシート未設定時はサンプルデータを表示

■ Googleスプレッドシートの作り方
1. 新しいGoogleスプレッドシートを作成
2. シート名を「episodes」「stories」にする
3. 同梱の episodes-template.csv / stories-template.csv と同じ1行目（列名）を作る
4. スプレッドシートを閲覧可能な公開設定にする
   （サイトから読み取るため、少なくともリンクを知っている人が閲覧可能な状態が必要）
5. スプレッドシートURLの /d/ と /edit の間にあるIDをコピー
6. config.js の SPREADSHEET_ID に貼る
7. GitHub Pagesへアップロード

■ episodes シート
id          一意のID
 year        放送年など
 title       表示タイトル
 summary     短い紹介
 tags        カンマ区切り。「ケンカ回,食べ物回」など
 comment     自分の感想・メモ
 published   TRUEで公開、FALSEで非公開
 sortOrder   並び順

■ stories シート
id             一意のID。URLの ?id=1 に使う
 episodeNo      第何話か
 title          タイトル
 summary        一覧用の短い紹介
 body           本文。セル内改行OK
 publishedDate  公開日
 status         「公開」でサイト表示。「下書き」は非表示
 sortOrder      並び順

■ 重要
スプレッドシートの列名は変更しないでください。
本文はGoogleスプレッドシートの1セル内に改行して入力できます。
