package com.devcollab.auth.service;

import com.devcollab.auth.entity.Role;
import com.devcollab.auth.entity.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class JwtServiceTest {
    @Test
    void generatesToken(){
        JwtService service = new JwtService("devcollab-auth", 3600000);
        User user = User.builder().id("u1").email("a@b.com").firstName("A").lastName("B").role(Role.STUDENT).build();
        assertNotNull(service.generateAccessToken(user));
    }
}
