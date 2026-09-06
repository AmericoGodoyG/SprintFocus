import { Outlet } from 'react-router-dom'
import styles from './MainLayout.module.css'

function MainLayout() {
  return (
    <div className={styles.layout}>
      {/* Ambient Liquid Canvas — Soft organic pools of light refracted by the frosted glass */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <div className={styles.liquidOrb1} />
        <div className={styles.liquidOrb2} />
        <div className={styles.liquidOrb3} />
      </div>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default MainLayout
