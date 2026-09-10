fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Royal Wedding Order Board");
}
