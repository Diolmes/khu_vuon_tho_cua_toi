# Hướng dẫn dành cho chủ vườn

Khu vườn thơ: mỗi bài thơ là một bông hoa. Bạn là chủ vườn, nên làm được mọi thứ khách làm được, cộng thêm gieo hạt, sửa bài, dời hoa, gọi ong, xem nhật ký và sao lưu.

## 1. Vào vườn

- Mở web, chọn khung **🌷 Chủ vườn**, gõ mật khẩu rồi bấm **Vào vườn**.
- Mật khẩu là mật khẩu của tài khoản `chu-vuon@khuvuontho.app` trong Firebase Authentication. Nó không nằm trong code. Muốn đổi thì đổi trong Firebase (Authentication → Users).
- Trình duyệt nhớ bạn đã đăng nhập. Bấm **🚪 Rời vườn** để thoát hẳn.
- Khách chọn khung **🐝 Khách** và chỉ cần gõ tên (có thể vẽ thêm một nhân vật, không bắt buộc).

## 2. Gieo hạt (trồng bài thơ)

1. Bấm **🌱 Hạt giống** ở góc dưới trái.
2. Dán bài thơ vào ô, hoặc bấm **📷 Đọc chữ từ ảnh** (hoặc thả/dán ảnh) để web tự đọc chữ tiếng Việt từ ảnh.
3. Bấm **Gieo hạt**. Hạt rơi xuống rồi hoa nở.

Kiểu hoa:
- Có 50 mẫu hoa, được chọn lần lượt trong một "túi hạt" đã xáo trộn. Dùng hết 50 mẫu mới xáo lại, và không bao giờ có hai bông giống nhau mọc liên tiếp.
- Bạn không chọn được kiểu hoa. Kiểu hoa của một bài được giữ cố định.

### Vị trí trồng hoa

- Hoa mới tự chọn **chỗ thoáng**: không sát và không đè lên hoa khác. Chỉ khi khu đó thật sự hết chỗ mới chen vào chỗ ít chật nhất.
- Hoa **không bao giờ mọc trên đường đi**. Điều này áp dụng cho hoa mới, hoa con do ong sinh ra, hoa trồng lại và hoa bạn dời.
- Hoa xa (gần chân trời) nhỏ hơn, hoa gần (gần đáy màn hình) to hơn. Vị trí gồm `x` (trái-phải) và `y` (xa-gần), lưu theo tỉ lệ nên hiển thị đúng trên mọi cỡ màn hình.
- Hoa mới luôn mọc ở **khu mới nhất** (xem mục 4). Nếu bạn đang đứng ở khu cũ khi gieo, web đưa bạn về khu mới nhất.

## 3. Làm việc với một bông hoa

Bấm vào bông hoa để mở bảng thơ. Rê chuột vào hoa thì câu thơ đầu bay lên như hương thơm.

Trong bảng thơ:
- **Căn lề**: ba nút nhỏ phía trên chọn căn trái / giữa / phải. Mỗi người tự chọn, máy nhớ lựa chọn.
- **Chạm vào một chữ**: các bông hoa có chữ đó rung rinh, tỏa sáng, hoa khác mờ đi. Hoa có chữ đó nhưng nằm ở khu khác hiện thành các khung nhỏ ở góc trái, bấm vào để nhảy tới.
- **✏️ sửa bài thơ**: sửa nội dung và đặt **ngày viết** (xem mục 5).
- **hái bông hoa này bỏ vào giỏ**: hái hoa vào giỏ.
- **📖 Ai đã khen / chê**: danh sách khách đã khen hoặc chê bông này, kèm giờ.
- Bấm ra ngoài bảng thơ (hoặc dấu ×, hoặc phím Esc) để đóng.

### Dời hoa

**Nhấn giữ** bông hoa khoảng nửa giây (điện thoại sẽ rung nhẹ), rồi kéo tới chỗ mới và thả tay. Nếu kéo lên đường đi, hoa mờ đỏ, thả ra thì hoa về chỗ cũ.

### Giỏ hoa 🧺

Hoa đã hái nằm trong giỏ. Bấm vào bông trong giỏ để đọc thơ. Mỗi hoa trong giỏ có:
- **🌱 Trồng lại**: bấm vào chỗ trống trong vườn để trồng lại (không chọn được đường đi).
- **📄 Nhân bản**: tạo thêm một bản sao của hoa, bản sao nằm ngay trong giỏ. Dùng khi muốn tặng mà vẫn giữ lại một bản: tặng bản sao, bản gốc cứ để lại trong giỏ hoặc trồng lại. Hoa do khách tặng (đen trắng) thì không nhân bản được.
- **🗑️ Thùng rác hữu cơ**: xóa hẳn, không lấy lại được.
- **🎁 Tặng**: viết tên người nhận (hoặc bỏ qua), web vẽ tấm thẻ hoa thành ảnh và chép vào clipboard để bạn dán gửi. Nếu trình duyệt không cho chép thì tải ảnh về máy. Gửi xong, hoa bị bỏ khỏi giỏ. Hoa do khách tặng (đen trắng) thì không tặng lại được.

## 4. Vườn chia theo năm: mỗi khu là một năm (từ 2022)

- Vườn có vô số khu. **Mỗi khu là một năm.** Nhãn dưới cùng (ví dụ "Khu 2026") cho biết bạn đang ở khu nào.
- Bài **chưa có ngày viết** nằm ở khu **mới nhất**. Khu mới nhất là năm hiện tại, hoặc năm lớn nhất của một bài đã điền ngày nếu năm đó lớn hơn.
- Bài **đã có ngày viết** nằm ở khu của năm đó.
- Đi giữa các khu:
  - Máy tính: cuộn chuột. Cuộn xuống để lùi về khu cũ hơn ("phía sau" vườn), cuộn lên để quay lại khu mới hơn.
  - Điện thoại: vuốt dọc trên phần đất trống.
  - Hoặc bấm nút **▲ ▼** hai bên nhãn khu. Bấm vào chính nhãn để nhập thẳng một năm.
- Khu cũ nhất là **2022** (trước 2022 vườn chưa có thơ), khu mới nhất là năm hiện tại hoặc năm lớn nhất của một bài đã điền ngày. Không đi ra ngoài khoảng đó được.
- Ong, bướm, mưa và cục phân bón đều làm việc trong khu bạn đang đứng. Ong chỉ ghép cặp hoa trong cùng một khu.

## 5. Sửa bài thơ và đặt ngày viết

Mở bài thơ, bấm **✏️ sửa bài thơ**:
- Sửa chữ trong ô bài thơ. Khi sửa chữ, các chữ đã rơi của bông này được làm mới (hoa khỏe lại).
- **Ngày viết**: chọn **Hôm nay**, hoặc gõ ba ô **DD / MM / YYYY**, hoặc **Bỏ ngày** để xóa. **Năm là bắt buộc** (4 chữ số, từ 2022 trở đi); tháng và ngày có thể bỏ trống (có ngày thì cần có tháng). Ví dụ chỉ điền `2023` thì bài hiện "viết năm 2023", điền thêm tháng thì hiện "viết tháng 03/2023", điền đủ thì hiện "viết ngày 15/03/2023".
- Có ngày thì hoa chuyển về khu của năm đó. Xóa ngày thì hoa trở về khu mới nhất. Web báo hoa chuyển sang khu nào.
- Bài lai (do ong sinh ra) không sửa được. Hoa lai tự mang ngày viết của bông mẹ.

## 6. Tìm hoa

Bấm **🔍 Tìm hoa**, gõ từ khóa. Không cần gõ dấu. Gõ nhiều từ thì bài phải có đủ các từ đó. Kết quả liệt kê hoa ở mọi khu, kèm tên khu. Bấm vào một kết quả để nhảy tới khu đó và mở bài.

## 7. Mưa ☔, ong 🐝, bướm 🦋

Mỗi thứ có hai cách chạy: **tự động mỗi ngày** vào giờ ngẫu nhiên, và **gọi bằng nút** trên thanh công cụ.

| | Tự động | Gọi bằng nút |
|---|---|---|
| ☔ Mưa | Mỗi ngày một cơn vào một giờ ngẫu nhiên trong 8h–22h | Gọi tùy ý, tối đa **3 lần trong 1 phút**, không giới hạn số cơn trong ngày. Đang mưa mà bấm thì chỉ nhắc "Đang mưa rồi nè", không tính vào 3 lần |
| 🐝 Ong | Mỗi ngày một lượt vào một giờ ngẫu nhiên trong 8h–22h | **Mỗi ngày một lượt** (cả vườn dùng chung). Chỉ chủ vườn gọi được |
| 🦋 Bướm | Mỗi ngày một lượt vào một giờ ngẫu nhiên trong 8h–22h | Gọi tùy ý (cả khách cũng gọi được). Tối đa **3 con trong vườn cùng lúc**. Bấm quá **5 lần trong 1 phút** thì báo "Bướm bay nhiều cũng biết mệt chứ bồ" |

Giờ tự động của mỗi ngày được chọn một lần và dùng chung cho cả vườn, nên không bị lặp bởi nhiều người cùng mở web.

### Mưa

- Một cơn mưa kéo dài 10 giây. Sau khoảng 3 giây mưa làm **1–2 bông hoa rụng chữ**. Mỗi hoa rụng tối đa một nửa số chữ.
- Hoa rụng chữ thì ngoẹo đầu, các chữ rơi xuống đất.
- Nhặt chữ: kéo từng chữ bỏ vào thùng phân, hoặc dùng **cái vợt** kéo quét qua nhiều chữ rồi đổ vào thùng. Mỗi chữ thành một cục phân bón.
- Bón phân: kéo một cục phân từ thùng thả vào bông hoa đang ngoẹo đầu. Một cục là hoa khỏe hẳn, chữ rơi trở về.
- Thùng phân không hiện số đếm. Thùng trống thì bấm vào sẽ có nhắc.

### Ong

- Ong bay tới thăm hai bông hoa thường rồi sinh ra một **chùm thơ lai** (hoa có hai bài thơ).
- Chỉ hoa thường trong cùng khu mới được làm bố mẹ. Hoa lai và hoa do khách tặng thì không.
- Mỗi cặp bố mẹ chỉ có một hoa con. Trong vườn tối đa 12 hoa lai.
- Hoa con mọc ở chỗ thoáng gần giữa hai bông bố mẹ (không đè hoa khác, không trên đường), và cùng khu với bố mẹ.

### Bướm

- Bướm bay một vòng quanh vườn, **đậu lên bài thơ được chạm tới gần nhất** (mở đọc, bón phân, trồng lại hoặc gieo hạt mới đều tính), vỗ cánh chậm, rồi bay thêm một vòng quanh bông hoa và bay đi. Một chuyến khoảng 30 giây.
- Nếu chưa ai chạm vào bài nào thì bướm đậu lên bông mới nhất của khu.
- Bướm chỉ thấy trong khu có bông hoa bướm đậu.
- Có 3 con thì phải đợi một con bay khỏi màn hình khoảng 3 giây mới gọi thêm được.

## 8. Khách và hạt giống tặng

- Khách có nút **🎁 Tặng hạt giống**. Bài khách gửi nằm trong hộp **🎁 Hạt được tặng** của bạn, kèm tên khách và giờ gửi.
- Với mỗi hạt bạn chọn **🌱 Gieo** (mọc thành hoa) hoặc **Bỏ đi**.
- Hoa mọc từ hạt tặng **màu đen trắng**, ghi "tặng từ …" khi mở bài. Chỉ hái được, không tặng lại được, và ong không dùng nó làm bố mẹ.
- Khách còn có thể **🌸 Khen hoa** hoặc **🙅 Chê hoa** ở cuối bảng thơ:
  - Khen: hiện "chà bông hoa thơm quá", bảng thơ đóng, một đàn 5 con bướm bay vào lượn quanh rồi đậu lên bông hoa (hoa rung rinh tỏa sáng), sau đó bay đi. Mọi người đang trong khu đó đều thấy.
  - Chê: hiện lời nhắn "tôi thử bạn thôi, ai cho chê mà chê 😇" kèm dòng "kí tên: chủ vườn".
  - Mỗi lần khen/chê đều ghi vào **📖 Ai đã khen / chê** của bông hoa đó, chỉ bạn xem được.

## 9. Nhân vật của khách

Khách có thể vẽ một nhân vật (bút marker, bánh xe màu, tẩy). Nhân vật đi bộ trong vườn theo con trỏ của khách, chỉ đi trên phần đất. Bạn thấy nhân vật của khách đang ở trong vườn, tên nằm dưới chân. Chủ vườn dùng con trỏ 🌷, không có nhân vật.

## 9b. Lán nghiên cứu 🏚️ (giấy nháp của chủ vườn)

Bấm **🏚️ Lán** để vào lán nghiên cứu, nơi bạn cất những hạt giống (bài thơ nháp) đang nghiên cứu. Chỉ chủ vườn thấy lán. Khách và nhân vật không vào được, và dữ liệu lán không đọc được từ phía khách.

- **Bảng gỗ ô vuông** phía trước ghim tối đa **9 tờ giấy**. Bấm vào một tờ để đọc đầy đủ, rồi chọn **✏️ Sửa** hoặc **🗑️ Bỏ**.
- **Bàn nghiên cứu** bên dưới có dụng cụ (kính hiển vi, ống nghiệm, kính lúp…) và một **mẩu giấy trắng** trước mặt:
  - **🔬 Nghiên cứu hạt mới**: bắt đầu viết nháp lên mẩu giấy.
  - **📌 Treo lên bảng**: ghim bài nháp lên bảng. Bảng đủ 9 tờ thì phải bỏ bớt một tờ trước.
  - **🗑️ Bỏ**: bỏ mẩu giấy vào thùng rác.
- **Thùng rác** bên cạnh chứa giấy đã bỏ (hiện số tờ):
  - **Xem giấy bỏ**: xem từng tờ, bấm **↩️ Lấy lại** để ghim lại lên bảng (cần còn chỗ trên bảng).
  - **🌱 Đổ vào thùng phân hữu cơ**: **xóa hẳn** tất cả giấy trong thùng rác, không lấy lại được (có hỏi xác nhận).
- Giấy nháp không nằm trong file **📤 Sao lưu**, và lán không tính vào vườn hoa. Muốn bài nháp thành hoa thì chép bài sang **🌱 Hạt giống** để gieo.

## 10. Thanh công cụ của chủ vườn

| Nút | Làm gì |
|---|---|
| 🔍 Tìm hoa | Tìm hoa theo từ khóa ở mọi khu |
| 🧺 Giỏ | Hoa đã hái |
| 🎁 Hạt được tặng | Hộp hạt giống khách tặng (kèm số hạt) |
| 🏚️ Lán | Lán nghiên cứu: bảng ghim 9 tờ giấy nháp, bàn nghiên cứu, thùng rác (kèm số tờ trên bảng) |
| ☔ | Gọi mưa |
| 🐝 | Gọi ong |
| 🦋 | Gọi bướm |
| 📖 Nhật ký | Hai tab: **🚪 Ra vào** (ai vào vườn lúc nào, rời lúc nào, kèm hình nhân vật của khách) và **🌸 Khen chê** (ai đã khen hay chê hoa nào; bấm **[tới hoa]** để mở thẳng bài thơ đó) |
| 📤 Sao lưu | Tải cả vườn về thành file `.json` |
| 📥 Nhập | Nhập vườn từ file sao lưu, hoặc vườn cũ còn trong trình duyệt |
| ✨ Giao diện | Đổi phong cách và bộ chữ (xem bên dưới) |
| 🚪 Rời vườn | Thoát |

Sao lưu nên làm thỉnh thoảng. File sao lưu gồm hoa (kể cả ngày viết, hoa tặng), chữ rơi và thùng phân. Nhập thì hoa trùng mã được ghi đè.

### Đổi giao diện ✨

Bấm **✨ Giao diện** (trên điện thoại chỉ còn icon) để mở bảng chọn:
- **Phong cách**: **Mặc định**, **Màu nước** (nền giấy loang, hoa và icon vẽ màu nước) hoặc **Doodle** (giấy vở kẻ ngang, nét mực viền, icon nét mực).
- **Bộ chữ**: Georgia (gốc), Cormorant Garamond + EB Garamond, Playfair Display, Newsreader, Josefin Sans, Shantell Sans + Patrick Hand (nét tay), Spectral + Lora.
- Lựa chọn chỉ lưu **trên trình duyệt của bạn**, mỗi người (kể cả khách) tự chọn riêng. Không ai khác thấy đổi theo và dữ liệu vườn không bị ảnh hưởng.
- Gõ thẳng lên địa chỉ cũng được, ví dụ `?theme=doodle&font=doodle` hoặc `?theme=watercolor`. Muốn quay về như cũ thì chọn Mặc định.
- Phong cách Màu nước và Doodle nặng hơn một chút nên máy yếu có thể chậm; khi đó dùng Mặc định.

## 11. Dữ liệu và an toàn

- Dữ liệu nằm trong Firebase Realtime Database. Luật bảo vệ nằm ở `database.rules.json`, đã publish lên Firebase. Mỗi lần sửa file này phải publish lại trong Firebase Console (Realtime Database → Rules).
- Khách không đọc được hộp hạt giống, giấy nháp trong lán, nhật ký ra vào, và không xem được ai khen/chê. Khách cũng không xóa được hoa.
- Cấu hình Firebase trong `firebase-config.js` là công khai theo thiết kế. Việc bảo vệ nằm ở luật.
- Gói Firebase miễn phí có giới hạn dung lượng và băng thông, đủ cho một khu vườn nhỏ.

## 12. Gợi ý khi gặp sự cố

- Web hiện bản cũ sau khi cập nhật: tải lại cứng (Cmd+Shift+R hoặc Ctrl+Shift+R).
- Báo "Tên miền này chưa được thêm vào Firebase": thêm tên miền vào Authentication → Settings → Authorized domains.
- Khách không gửi được hạt giống hoặc khen/chê: kiểm tra luật Firebase đã publish bản mới nhất chưa.
- Cần xem lại vườn cũ: nút **📥 Nhập** chọn file sao lưu.
