/* Bloome Song v16 설정 — 배포 시 이 파일 한 곳만 고치면 됩니다. */
window.BLOOME_CONFIG = {
  // Apps Script 웹 앱 URL (기존 배포를 '새 버전'으로 갱신하면 URL은 그대로입니다)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbztrD0YkxCbYa3ZAjefPJWwygqLsSsChlpSJhYffi28dnUN_oXT2WecigZv8n1UHJYZ/exec",
  // 미리듣기 안내 문구 (사장님 확정: 1시간~24시간)
  PREVIEW_ETA: "미리듣기는 1시간~24시간 안에 보내드려요",
  CONTACT_EMAIL: "bloome.korea@gmail.com",
  // 계좌이체 안내 (결제 팝업·checkout 에 그대로 표시)
  BANK_INFO: "카카오뱅크 3333-0111-75830 (예금주 박원재)",
  // 카드 결제 대행사(PG) — 계약 후 입력. 비워 두면 카드 결제 영역은 "준비 중"으로 표시됩니다.
  PG_PROVIDER: "",      // 예: "portone"
  PG_STORE_ID: "",      // PG/결제연동사가 발급한 공개용 상점 ID
  PG_CHANNEL_KEY: "",   // 공개용 채널 키 (시크릿 키는 절대 여기 넣지 않기 → Apps Script 스크립트 속성)
  // 사업자 정보 (푸터·개인정보처리방침). 비어 있는 항목은 화면에 "확인 중"으로 표시됩니다. [사장님 입력 필요]
  // 실시간 채팅(나중에): 카카오톡 채널 1:1 채팅 링크 예 "https://pf.kakao.com/_xxxx/chat". 비워 두면 버튼 안 보임.
  KAKAO_CHAT_URL: "",
  BIZ: {
    NAME: "블루메",
    CEO: "조은정",
    ADDRESS: "경기도 성남시 수정구 위례서일로 34, 1층 112호 (창곡동, 위례성희프라자)",
    REG_NO: "446-45-01389",  // 사업자등록번호 (블루메)
    PRIVACY_OFFICER: "박원재",  // 개인정보 보호책임자 이름·직책
    PRIVACY_CONTACT: "bloome.korea@gmail.com"
  }
};
