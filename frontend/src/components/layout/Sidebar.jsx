import NavLinks from './NavLinks.jsx';

export default function Sidebar() {
  return (
    <>
      <aside className="d-none d-lg-block bg-body-tertiary border-end" style={{ width: 240, minHeight: 'calc(100vh - 56px)' }}>
        <div className="py-3">
          <NavLinks />
        </div>
      </aside>

      <div className="offcanvas offcanvas-start" tabIndex="-1" id="sidebarOffcanvas" aria-labelledby="sidebarOffcanvasLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="sidebarOffcanvasLabel">
            Menu
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body">
          <NavLinks onNavigate={() => document.getElementById('sidebarOffcanvas')?.querySelector('.btn-close')?.click()} />
        </div>
      </div>
    </>
  );
}
