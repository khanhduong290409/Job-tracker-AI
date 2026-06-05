package com.jobtrackerai.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.jobtrackerai.auth.config.GoogleProperties;
import com.jobtrackerai.shared.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
@Slf4j
public class GoogleOAuthService {

    private static final String TOKEN_URL    = "https://oauth2.googleapis.com/token";//là url mình cần gửi post đến google (đi với code + clientId + clientSecret) đến để đổi code lấy access_token
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";//là url mình gửi get đến google (kèm access_token) để lấy info user

    private final GoogleProperties googleProperties;
    private final RestClient restClient;//là http client của spring dùng để gọi http request đến api bên ngoài ( ở đâu là google api)

    public GoogleOAuthService(GoogleProperties googleProperties) {
        this.googleProperties = googleProperties;
        this.restClient = RestClient.create();
    }

    //trả về userinfo sau khi đổi access_token lấy userinfo
    public GoogleUserInfo exchangeCode(String code, String redirectUri) {
        String googleAccessToken = fetchGoogleAccessToken(code, redirectUri);
        return fetchUserInfo(googleAccessToken);
    }

    private String fetchGoogleAccessToken(String code, String redirectUri) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();//bên dưới có giải thích
        body.add("grant_type", "authorization_code");//bên dưới có giải thích
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        body.add("client_id", googleProperties.getClientId());
        body.add("client_secret", googleProperties.getClientSecret());

        try {
            GoogleTokenResponse response = restClient.post()
                    .uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)//->body được gửi đi
                    .retrieve()// ← GỬI request, chờ response ( đây là lệnh thực sự gửi http request đi)
                    .body(GoogleTokenResponse.class);// đọc body nhận về truyền vào class googletokenresponse

            if (response == null || response.accessToken() == null) {
                throw new BadRequestException("Failed to exchange Google auth code");
            }
            return response.accessToken();
        } catch (RestClientException e) {
            log.warn("Google token exchange failed: {}", e.getMessage());
            throw new BadRequestException("Invalid or expired Google auth code");
        }
    }

    private GoogleUserInfo fetchUserInfo(String googleAccessToken) {
        try {
            GoogleUserInfoResponse response = restClient.get()
                    .uri(USERINFO_URL)
                    .header("Authorization", "Bearer " + googleAccessToken)
                    .retrieve()
                    .body(GoogleUserInfoResponse.class);

            if (response == null || response.sub() == null) {
                throw new BadRequestException("Failed to fetch Google user info");
            }
            return new GoogleUserInfo(
                    response.sub(),//sub là viết tắt của "subject" — ID duy nhất của user trên Google.
                    response.email(),
                    response.name(),
                    response.picture()
            );
        } catch (RestClientException e) {
            log.warn("Google userinfo fetch failed: {}", e.getMessage());
            throw new BadRequestException("Failed to fetch Google user info");
        }
    }

    // ── Google API response records (private — chỉ dùng nội bộ) ──────────────

    private record GoogleTokenResponse(
            @JsonProperty("access_token") String accessToken
            // thực ra sau khi gửi post đi thì google trả về nhiều field chứ không chỉ mỗi access_token 
            //nhưng ở đây ta chỉ cần access_token nên @JsonProperty("access_token") để lấy đúng field access_token trong json google trả về
    ) {}

    private record GoogleUserInfoResponse(
            String sub,
            String email,
            String name,
            String picture
    ) {}

    // ── Output record trả về cho AuthService ──────────────────────────────────

    public record GoogleUserInfo(
            String googleId,
            String email,
            String fullName,
            String avatarUrl
    ) {}
}
/*
Đây là kiểu dữ liệu đặc biệt của Spring để build body cho request dạng application/x-www-form-urlencoded.

// Map thường — 1 key chỉ có 1 value
Map<String, String> map = new HashMap<>();
map.put("key", "value1");
map.put("key", "value2");  // ghi đè value1

// MultiValueMap — 1 key có thể có nhiều value
MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
map.add("key", "value1");
map.add("key", "value2");  // → key = ["value1", "value2"]


grant_type là tham số bắt buộc của chuẩn OAuth2 — nói cho Google biết mình đang dùng flow nào.

OAuth2 có nhiều flow khác nhau:

grant_type	Flow
authorization_code ->	User login qua browser (flow này)
refresh_token ->	Dùng refresh token lấy access token mới
client_credentials ->	Server-to-server, không có user
Mình gửi authorization_code để Google biết: "Tôi đang đổi code lấy token theo flow user login" — từ đó Google mới xử lý đúng cách, kiểm tra code + redirect_uri thay vì các tham số khác.

Thiếu field này → Google trả về lỗi unsupported_grant_type.
 

Tại sao chỉ có accessToken?
Google thực ra trả về nhiều field hơn:


{
  "access_token": "ya29.xxxx",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "email profile",
  "id_token": "eyJhbGci..."
}
Nhưng code chỉ khai báo accessToken vì chỉ cần dùng mình nó để gọi USERINFO_URL ở bước tiếp theo. Jackson tự bỏ qua các field không khai báo trong record — không lỗi.
*/
