# AUR package

`PKGBUILD` installs the release tarball that the release workflow attaches to every GitHub release, plus shell completions, the app menu entry and the icon.

## First upload

1. Create an account on https://aur.archlinux.org and add your SSH public key in *My Account*
2. Publish:

```sh
git clone ssh://aur@aur.archlinux.org/claudegrid.git aur-claudegrid
cp PKGBUILD .SRCINFO aur-claudegrid/
cd aur-claudegrid
git add PKGBUILD .SRCINFO
git commit -m "claudegrid 1.1.0"
git push
```

## New versions

1. set `pkgver`, reset `pkgrel=1`, and put the output of `curl -sL <source url> | sha256sum` in `sha256sums`
2. regenerate `.SRCINFO` with `makepkg --printsrcinfo > .SRCINFO` (or update its version, source and checksum lines)
3. commit both files to the AUR repo and push
