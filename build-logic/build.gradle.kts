plugins {
    `kotlin-dsl`
}

dependencies {
    // These allow the convention plugins to apply AGP and Kotlin plugins
    // by name without versions (versions come from the classpath here)
    implementation("com.android.tools.build:gradle:8.7.0")
    implementation("org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0")
    implementation("org.jetbrains.compose:compose-gradle-plugin:1.7.3")
    implementation("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.1.0")
    implementation("io.gitlab.arturbosch.detekt:detekt-gradle-plugin:1.23.7")
}
