# AUR package

`PKGBUILD` installs the release tarball that the release workflow attaches to every GitHub release.

To publish a new version:

1. bump `pkgver` and set `sha256sums` to the output of `curl -sL <source url> | sha256sum`
2. run `makepkg --printsrcinfo > .SRCINFO`
3. commit both files to `ssh://aur@aur.archlinux.org/claudegrid.git`
