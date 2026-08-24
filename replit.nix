{ pkgs }: {
  deps = [
    pkgs.nodejs-20
    pkgs.ffmpeg
    pkgs.chromium
    pkgs.glib
    pkgs.nss
    pkgs.libxss
    pkgs.libasound
    pkgs.libxkbfile
    pkgs.libxrandr
    pkgs.libxcomposite
    pkgs.libxcursor
    pkgs.libxdamage
    pkgs.libxfixes
    pkgs.libxi
    pkgs.libxtst
    pkgs.cairo
    pkgs.pango
    pkgs.gdk-pixbuf
    pkgs.atk
    pkgs.gtk3
  ];
}