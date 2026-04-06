plugins {
    id("android-library-convention")
}

android {
    namespace = "com.example.knightlore.data"
}

dependencies {
    implementation(project(":domain"))
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    implementation(libs.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)
}
