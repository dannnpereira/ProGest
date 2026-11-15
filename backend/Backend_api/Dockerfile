# ---------- Build ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Baixa as dependencias antes de copiar o codigo: se so o codigo mudar,
# o proximo build reaproveita esta etapa (bem mais rapido no Render)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests


# ---------- Execucao ----------
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Pasta do banco H2
RUN mkdir -p /app/data

# Em container o backend roda sempre em modo producao (console do H2 desligado etc.)
ENV SPRING_PROFILES_ACTIVE=prod

# Memoria: o Java usa no maximo 70% da memoria do container. Cabe nos 512 MB
# do plano gratis do Render. (O docker-compose da EC2 pode sobrescrever.)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"

# O Render informa a porta em PORT; sem ela, 8081 (docker-compose / EC2)
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
