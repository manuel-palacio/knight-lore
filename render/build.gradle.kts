plugins {
    id("android-library-convention")
}

android {
    namespace = "com.example.knightlore.render"
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":core"))
}
