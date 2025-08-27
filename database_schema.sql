-- 권한 관리 시스템 DB 스키마

-- 1. 권한 종류 테이블
CREATE TABLE permission_types (
    permission_code VARCHAR(50) PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL,
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y' CHECK (use_yn IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 사용자 테이블 (기존 테이블이 있다면 참고용)
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    password_hash VARCHAR(255),
    use_yn CHAR(1) DEFAULT 'Y' CHECK (use_yn IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 사용자 권한 매핑 테이블
CREATE TABLE user_permissions (
    user_permission_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    permission_code VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_code) REFERENCES permission_types(permission_code) ON DELETE CASCADE,
    UNIQUE(user_id, permission_code)
);

-- 4. 화면 테이블 (기존 테이블이 있다면 참고용)
CREATE TABLE screens (
    screen_id SERIAL PRIMARY KEY,
    screen_path VARCHAR(200) UNIQUE NOT NULL,
    screen_name VARCHAR(100) NOT NULL,
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y' CHECK (use_yn IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 화면 권한 매핑 테이블
CREATE TABLE screen_permissions (
    screen_permission_id SERIAL PRIMARY KEY,
    screen_id INTEGER NOT NULL,
    permission_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_code) REFERENCES permission_types(permission_code) ON DELETE CASCADE,
    UNIQUE(screen_id, permission_code)
);

-- 인덱스 생성
CREATE INDEX idx_permission_types_use_yn ON permission_types(use_yn);
CREATE INDEX idx_users_use_yn ON users(use_yn);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_code ON user_permissions(permission_code);
CREATE INDEX idx_screen_permissions_screen_id ON screen_permissions(screen_id);
CREATE INDEX idx_screen_permissions_permission_code ON screen_permissions(permission_code);

-- 샘플 데이터 삽입
INSERT INTO permission_types (permission_code, permission_name, description, use_yn) VALUES
('ADMIN', '관리자', '시스템 전체 관리 권한', 'Y'),
('USER_MANAGE', '사용자 관리', '사용자 정보 관리 권한', 'Y'),
('PERMISSION_MANAGE', '권한 관리', '권한 설정 관리 권한', 'Y'),
('SCREEN_MANAGE', '화면 관리', '화면 접근 권한 관리', 'Y'),
('API_MANAGE', 'API 관리', 'API 접근 권한 관리', 'Y'),
('REPORT_VIEW', '보고서 조회', '보고서 조회 권한', 'Y'),
('DATA_EXPORT', '데이터 내보내기', '데이터 내보내기 권한', 'Y');

-- 샘플 사용자 데이터 (비밀번호는 실제 환경에서 해시화 필요)
INSERT INTO users (user_id, user_name, email, use_yn) VALUES
('admin', '관리자', 'admin@example.com', 'Y'),
('user1', '사용자1', 'user1@example.com', 'Y'),
('user2', '사용자2', 'user2@example.com', 'Y'),
('manager', '매니저', 'manager@example.com', 'Y');

-- 샘플 화면 데이터
INSERT INTO screens (screen_path, screen_name, description, use_yn) VALUES
('/dashboard', '대시보드', '메인 대시보드 화면', 'Y'),
('/users', '사용자 관리', '사용자 목록 및 관리', 'Y'),
('/permissions', '권한 관리', '권한 설정 관리', 'Y'),
('/screens', '화면 관리', '화면 접근 권한 관리', 'Y'),
('/reports', '보고서', '보고서 조회', 'Y'),
('/api-permissions', 'API 권한 관리', 'API 접근 권한 관리', 'Y'),
('/user-permissions', '사용자 권한 관리', '사용자별 권한 관리', 'Y');

-- 샘플 사용자 권한 매핑
INSERT INTO user_permissions (user_id, permission_code) VALUES
('admin', 'ADMIN'), -- admin에게 ADMIN 권한
('admin', 'USER_MANAGE'), -- admin에게 USER_MANAGE 권한
('admin', 'PERMISSION_MANAGE'), -- admin에게 PERMISSION_MANAGE 권한
('manager', 'USER_MANAGE'), -- manager에게 USER_MANAGE 권한
('manager', 'REPORT_VIEW'), -- manager에게 REPORT_VIEW 권한
('user1', 'REPORT_VIEW'), -- user1에게 REPORT_VIEW 권한
('user2', 'REPORT_VIEW'); -- user2에게 REPORT_VIEW 권한

-- 샘플 화면 권한 매핑
INSERT INTO screen_permissions (screen_id, permission_code) VALUES
(1, 'ADMIN'), -- 대시보드는 ADMIN 권한 필요
(2, 'USER_MANAGE'), -- 사용자 관리는 USER_MANAGE 권한 필요
(3, 'PERMISSION_MANAGE'), -- 권한 관리는 PERMISSION_MANAGE 권한 필요
(4, 'SCREEN_MANAGE'), -- 화면 관리는 SCREEN_MANAGE 권한 필요
(5, 'REPORT_VIEW'), -- 보고서는 REPORT_VIEW 권한 필요
(6, 'API_MANAGE'), -- API 권한 관리는 API_MANAGE 권한 필요
(7, 'PERMISSION_MANAGE'); -- 사용자 권한 관리는 PERMISSION_MANAGE 권한 필요

-- 뷰 생성 (자주 사용되는 조회를 위한 뷰)
CREATE VIEW user_permission_view AS
SELECT 
    u.user_id,
    u.user_name,
    u.email,
    u.use_yn as user_use_yn,
    pt.permission_code,
    pt.permission_name,
    pt.description as permission_description,
    pt.use_yn as permission_use_yn,
    up.granted_at
FROM users u
LEFT JOIN user_permissions up ON u.user_id = up.user_id
LEFT JOIN permission_types pt ON up.permission_code = pt.permission_code
WHERE u.use_yn = 'Y' AND pt.use_yn = 'Y';

CREATE VIEW screen_permission_view AS
SELECT 
    s.screen_id,
    s.screen_path,
    s.screen_name,
    s.description as screen_description,
    s.use_yn as screen_use_yn,
    pt.permission_code,
    pt.permission_name,
    pt.description as permission_description,
    pt.use_yn as permission_use_yn
FROM screens s
LEFT JOIN screen_permissions sp ON s.screen_id = sp.screen_id
LEFT JOIN permission_types pt ON sp.permission_code = pt.permission_code
WHERE s.use_yn = 'Y' AND pt.use_yn = 'Y';

-- 트리거 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_types_updated_at BEFORE UPDATE ON permission_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON screens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 