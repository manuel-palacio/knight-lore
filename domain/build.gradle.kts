plugins {
    id("kotlin-jvm-convention")
}

dependencies {
    implementation(project(":core"))
    implementation(libs.kotlinx.coroutines.core)
}
