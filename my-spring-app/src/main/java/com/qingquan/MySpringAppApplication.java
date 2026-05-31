package com.qingquan;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.qingquan.mapper")
@ConfigurationPropertiesScan("com.qingquan.config")
@EnableScheduling
public class MySpringAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(MySpringAppApplication.class, args);
    }

}
