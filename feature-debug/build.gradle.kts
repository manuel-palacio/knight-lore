plugins {
    id("android-library-convention")
}

android {
    namespace = "com.example.knightlore.debug"
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":render"))
}
